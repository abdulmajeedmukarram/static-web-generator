"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mic, Square, Check, Loader2, RefreshCw, Keyboard, ChevronRight, Upload, Leaf, ThumbsUp, Pencil } from "lucide-react";

const SUBMIT_TIMEOUT_MS = 30_000;
const MAX_ROUNDS = 4;

type SubmitStatus = "idle" | "submitting" | "error";
type InputMode = "voice" | "type";
type RecState = "idle" | "recording" | "transcribing";
type Phase = "intake" | "questions" | "confirm" | "correct";
type LangCode = "en-IN" | "hi-IN" | "te-IN" | "ta-IN";

const LANGS: { code: LangCode; label: string }[] = [
  { code: "en-IN", label: "English" }, { code: "hi-IN", label: "हिन्दी" },
  { code: "te-IN", label: "తెలుగు" }, { code: "ta-IN", label: "தமிழ்" },
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve((fr.result as string).split(",")[1]);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

export default function PatientIntakePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [lang, setLang] = useState<LangCode>("en-IN");
  const [mode, setMode] = useState<InputMode>("voice");
  const [recState, setRecState] = useState<RecState>("idle");
  const [voiceText, setVoiceText] = useState("");
  const [typedText, setTypedText] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [ayushMode, setAyushMode] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>("intake");
  const [questions, setQuestions] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answered, setAnswered] = useState<{ q: string; a: string }[]>([]);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const logRef = useRef<string[]>([]);
  const roundsRef = useRef(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const vadRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const maxRef = useRef<number | null>(null);

  const inQuestions = phase === "questions" && qIndex < questions.length;
  const activeMode: InputMode = !mounted ? "type" : mode;
  const liveText = activeMode === "voice" ? voiceText : typedText;
  const hasText = liveText.trim().length > 0;

  function clearInput() { setVoiceText(""); setTypedText(""); }

  function stopVad() {
    if (vadRef.current) { clearInterval(vadRef.current); vadRef.current = null; }
    if (maxRef.current) { clearInterval(maxRef.current); maxRef.current = null; }
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }

  async function toggleRecording() {
    if (recState === "recording") { mediaRef.current?.stop(); return; }
    if (recState === "transcribing") return;
    setErrorMessage(null); setVoiceText("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRef.current = rec;
      const chunks: Blob[] = [];

      // Silence auto-stop: transcribe ~1.8s after the patient stops talking
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      void ctx.resume(); ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let silentMs = 0; let heard = false;
      vadRef.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(buf);
        let rms = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; rms += v * v; }
        rms = Math.sqrt(rms / buf.length);
        if (rms > 0.01) { heard = true; silentMs = 0; }
        else if (heard) { silentMs += 200; if (silentMs >= 1800) mediaRef.current?.stop(); }
      }, 200);
      maxRef.current = window.setInterval(() => mediaRef.current?.stop(), 60_000);

      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = async () => {
        stopVad();
        stream.getTracks().forEach((t) => t.stop());
        setRecState("transcribing");
        try {
          const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          const base64 = await blobToBase64(blob);
          const res = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audioBase64: base64, mimeType: blob.type || "audio/webm", lang }) });
          if (!res.ok) throw new Error();
          const data = await res.json();
          setVoiceText(data.transcript || "");
        } catch {
          setErrorMessage("Couldn't transcribe. Check connection or use typing.");
        } finally { setRecState("idle"); }
      };
      rec.start();
      setRecState("recording");
    } catch {
      setErrorMessage("Microphone access denied. Use typing instead.");
      setRecState("idle");
    }
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/extract-document", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, fileBase64: (reader.result as string).split(",")[1], mimeType: file.type, fileName: file.name }) });
        if (res.ok) setUploadedDocs((p) => [...p, file.name]);
      } catch { setErrorMessage("Failed to scan document."); }
      finally { setUploadingDoc(false); }
    };
    reader.readAsDataURL(file);
  }

  async function callAnalyze(text: string, stage: "followup" | "final") {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, raw_transcript: text, lang, stage, ayush_mode: ayushMode }), signal: controller.signal });
      if (!res.ok) throw new Error();
      return await res.json();
    } finally { clearTimeout(t); }
  }

  async function finalize(text: string) {
    setSubmitStatus("submitting");
    try {
      await callAnalyze(text, "final");
      router.push(`/patient/${patientId}/success`);
    } catch {
      setErrorMessage("Couldn't send. Your answers are safe — try again.");
      setSubmitStatus("error");
    }
  }

  async function askFollowup(full: string) {
    setSubmitStatus("submitting");
    try {
      const data = await callAnalyze(full, "followup");
      roundsRef.current += 1;
      const qs = Array.isArray(data?.follow_up_questions) ? (data.follow_up_questions as string[]).slice(0, 3) : [];
      if (data?.sufficient === false && qs.length > 0 && roundsRef.current < MAX_ROUNDS) {
        setQuestions(qs); setQIndex(0); setAnswered([]); setPhase("questions"); clearInput(); setSubmitStatus("idle");
      } else if (data?.confirmation) {
        setConfirmation(data.confirmation); setPhase("confirm"); setSubmitStatus("idle");
      } else {
        await finalize(full);
      }
    } catch { await finalize(full); }
  }

  async function handleIntakeSubmit() {
    const first = liveText.trim();
    logRef.current = [`Patient: ${first}`];
    clearInput();
    await askFollowup(logRef.current.join("\n"));
  }

  async function handleAnswerNext() {
    const answer = liveText.trim();
    if (!answer) return;
    logRef.current.push(`Assistant: ${questions[qIndex]}`, `Patient: ${answer}`);
    setAnswered((p) => [...p, { q: questions[qIndex], a: answer }]);
    setQIndex(qIndex + 1);
    clearInput();
    if (qIndex + 1 >= questions.length) {
      await askFollowup(logRef.current.join("\n"));
    }
  }

  async function handleConfirm(yes: boolean) {
    if (yes) {
      await finalize(logRef.current.join("\n") + "\nPatient confirmed the summary as correct.");
    } else {
      setPhase("correct"); setConfirmation(null); setSubmitStatus("idle");
    }
  }

  async function handleCorrectSubmit() {
    const fix = liveText.trim();
    if (!fix) return;
    logRef.current.push(`Patient correction: ${fix}`);
    clearInput();
    await askFollowup(logRef.current.join("\n"));
  }

  if (submitStatus === "submitting") {
    return (
      <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#FAF6EE] px-6 py-10">
        <Loader2 className="h-16 w-16 animate-spin text-[#2F5233]" />
        <p className="mt-4 text-2xl font-medium text-[#2B2620]">Thinking…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#FAF6EE] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <div className="flex w-full gap-2">
          {LANGS.map((l) => (
            <button key={l.code} type="button" onClick={() => setLang(l.code)} className={`flex-1 rounded-xl border-2 py-2 text-base font-semibold transition-colors ${lang === l.code ? "border-[#2F5233] bg-[#2F5233] text-white" : "border-[#E4DCC8] bg-[#FFFDF9] text-[#6E6555]"}`}>{l.label}</button>
          ))}
        </div>

        <div className="flex w-full items-center justify-between rounded-2xl border border-[#E4DCC8] bg-[#FFFDF9] p-3">
          <button type="button" onClick={() => setAyushMode(!ayushMode)} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${ayushMode ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-600"}`}>
            <Leaf className="h-4 w-4" /> {ayushMode ? "AYUSH Mode ON" : "AYUSH Mode"}
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-stone-200 px-3 py-1.5 text-sm font-semibold text-stone-600">
            {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Scan Doc
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleDocUpload} />
          </label>
        </div>
        {uploadedDocs.length > 0 && <p className="text-xs text-emerald-700">Scanned: {uploadedDocs.join(", ")}</p>}

        {errorMessage && <p role="alert" className="text-center text-lg text-[#8f1e18]">{errorMessage}</p>}

        {answered.map((x, i) => (
          <div key={i} className="w-full rounded-2xl border border-[#E4DCC8] bg-[#FFFDF9] p-4 text-left">
            <p className="text-lg text-[#6E6555]">{x.q}</p>
            <p className="mt-1 flex items-start gap-2 text-xl text-[#2B2620]"><Check className="mt-1 h-6 w-6 shrink-0 text-[#2F5233]" strokeWidth={2.5} />{x.a}</p>
          </div>
        ))}

        {phase === "confirm" && confirmation ? (
          <>
            <div className="w-full rounded-3xl border-2 border-[#2F5233] bg-white p-5 text-center">
              <p className="text-xl leading-relaxed text-[#2B2620]">{confirmation}</p>
            </div>
            <div className="flex w-full gap-3">
              <button type="button" onClick={() => handleConfirm(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2F5233] py-5 text-xl font-semibold text-white shadow-md active:bg-[#25401F]">
                <ThumbsUp className="h-6 w-6" /> Yes
              </button>
              <button type="button" onClick={() => handleConfirm(false)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#B3261E] py-5 text-xl font-semibold text-[#B3261E] active:bg-[#B3261E]/10">
                <Pencil className="h-6 w-6" /> Fix it
              </button>
            </div>
          </>
        ) : (
          <>
            {inQuestions && <p className="text-base font-semibold uppercase tracking-wide text-[#6E6555]">Question {qIndex + 1} of {questions.length}</p>}

            <p className="text-center text-2xl font-medium leading-snug text-[#2B2620]">
              {inQuestions
                ? questions[qIndex]
                : phase === "correct"
                  ? "Tell us what to fix"
                  : activeMode === "voice"
                    ? recState === "recording" ? "Listening… (auto-stops when you pause)" : recState === "transcribing" ? "Writing down your words…" : "Tap and tell us how you feel"
                    : "Type how you feel"}
            </p>

            {activeMode === "voice" ? (
              <>
                <div className="relative flex h-44 w-44 items-center justify-center">
                  {recState === "recording" && <span className="absolute inset-0 rounded-full bg-[#B3261E]/30 motion-safe:animate-ping [animation-duration:1.6s]" />}
                  <button type="button" onClick={toggleRecording} disabled={recState === "transcribing"} className={`relative z-10 flex h-full w-full items-center justify-center rounded-full shadow-lg transition-colors ${recState === "recording" ? "bg-[#B3261E]" : "bg-[#2F5233]"}`}>
                    {recState === "recording" ? <Square className="h-14 w-14 text-white" fill="white" /> : recState === "transcribing" ? <Loader2 className="h-14 w-14 animate-spin text-white" /> : <Mic className="h-16 w-16 text-white" />}
                  </button>
                </div>
                <div className="min-h-[7rem] w-full rounded-3xl border border-[#E4DCC8] bg-[#FFFDF9] p-5 text-2xl leading-relaxed text-[#2B2620] shadow-sm">
                  {hasText ? <p className="whitespace-pre-wrap">{liveText}</p> : <p className="text-[#6E6555]">Your words will appear here…</p>}
                </div>
              </>
            ) : (
              <textarea value={typedText} onChange={(e) => setTypedText(e.target.value)} placeholder="e.g. fever since 3 days…" className="min-h-[8rem] w-full rounded-3xl border border-[#E4DCC8] bg-[#FFFDF9] p-5 text-2xl leading-relaxed text-[#2B2620] shadow-sm placeholder:text-[#6E6555] focus:outline focus:outline-4 focus:outline-[#2F5233]" />
            )}

            <button
              type="button"
              disabled={!hasText}
              onClick={phase === "intake" ? handleIntakeSubmit : phase === "correct" ? handleCorrectSubmit : handleAnswerNext}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#2F5233] py-5 text-2xl font-semibold text-white shadow-md transition-colors active:bg-[#25401F] disabled:opacity-40"
            >
              {inQuestions ? <><ChevronRight className="h-7 w-7" /> Next</> : <><Check className="h-7 w-7" /> Submit</>}
            </button>

            {mounted && (
              <button type="button" onClick={() => { setMode(activeMode === "voice" ? "type" : "voice"); clearInput(); }} className="flex items-center gap-2 text-lg text-[#2F5233] underline underline-offset-4">
                {activeMode === "voice" ? <><Keyboard className="h-5 w-5" /> Prefer typing?</> : <><Mic className="h-5 w-5" /> Prefer talking?</>}
              </button>
            )}
          </>
        )}

        {submitStatus === "error" && <p role="alert" className="text-center text-lg text-[#8f1e18]">Something went wrong — your answers are safe. Tap Submit to retry.</p>}
      </div>
    </main>
  );
}
