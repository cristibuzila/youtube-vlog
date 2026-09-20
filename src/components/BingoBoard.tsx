import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { BingoChallenge, BingoState, GameRoom, Player } from '../types';
import { CAHUL_BINGO_CHALLENGES } from '../data/challenges';
import { CheckCircle2, Clock, XCircle, Camera, Upload, AlertCircle, Sparkles, Award, FileText, ChevronRight, X, LayoutGrid, List } from 'lucide-react';

interface BingoBoardProps {
  room: GameRoom;
  player: Player;
  onSubmitProof: (challengeId: number, proofUrl: string, proofNote: string) => Promise<void>;
}

export const BingoBoard: React.FC<BingoBoardProps> = ({
  player,
  onSubmitProof,
}) => {
  const [selectedChallenge, setSelectedChallenge] = useState<BingoChallenge | null>(null);
  const [proofNote, setProofNote] = useState<string>('');
  const [proofImage, setProofImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lang, setLang] = useState<'ro' | 'en'>('ro');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const bingoState: BingoState = player.bingo || {
    submissions: {},
    completedCount: 0,
    linesCount: 0,
    hasWonBingo: false,
  };

  const handleOpenChallenge = (challenge: BingoChallenge) => {
    setSelectedChallenge(challenge);
    const existing = bingoState.submissions[challenge.id];
    setProofNote(existing?.proofNote || '');
    setProofImage(existing?.proofUrl || '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setProofImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedChallenge) return;
    setIsSubmitting(true);
    try {
      await onSubmitProof(selectedChallenge.id, proofImage || 'photo_proof_submitted.jpg', proofNote);
      setSelectedChallenge(null);
      setProofNote('');
      setProofImage('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerBingoCelebration = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="w-full flex flex-col space-y-4 max-w-4xl mx-auto pb-8">
      {/* Bingo Header & Progress Stats */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <h2 className="text-xl font-extrabold tracking-tight text-white font-display">
                CAHUL HUNT BINGO
              </h2>
              {bingoState.hasWonBingo && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black animate-pulse flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> BINGO WON!
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              25 Provocări • 1 Obiectiv • Fii tu însuți (Cahul Outdoor Edition)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle (Grid vs Mobile List) */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                id="btn-bingo-view-grid"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'
                }`}
                title="5x5 Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-bingo-view-list"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'
                }`}
                title="Mobile List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              id="btn-toggle-lang"
              onClick={() => setLang(lang === 'ro' ? 'en' : 'ro')}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white transition"
            >
              🌐 {lang === 'ro' ? 'Română' : 'English'}
            </button>
            {bingoState.hasWonBingo && (
              <button
                id="btn-bingo-confetti"
                onClick={triggerBingoCelebration}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-extrabold shadow-lg transition active:scale-95 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Celebrează!
              </button>
            )}
          </div>
        </div>

        {/* Progress Bars and Line Counter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1 font-mono">
              <span>COMPLETED</span>
              <span className="text-amber-400 font-bold">{bingoState.completedCount} / 25</span>
            </div>
            <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 rounded-full"
                style={{ width: `${(bingoState.completedCount / 25) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-neutral-400 font-mono">BINGO LINES</div>
              <div className="text-xl font-extrabold text-white font-mono flex items-center gap-2">
                <span>{bingoState.linesCount}</span>
                <span className="text-xs font-normal text-neutral-500">
                  {bingoState.linesCount >= 1 ? '🔥 Active' : 'Need 5 in a row'}
                </span>
              </div>
            </div>
            <Award className={`w-7 h-7 ${bingoState.linesCount > 0 ? 'text-amber-400' : 'text-neutral-600'}`} />
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-neutral-400 font-mono">APPROVAL STATUS</div>
              <div className="text-xs font-semibold text-neutral-200 mt-1">
                {Object.values(bingoState.submissions).filter((s) => s.status === 'PENDING').length} Pending GM review
              </div>
            </div>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* BINGO BOARD DISPLAY (Grid or Mobile List) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
          {CAHUL_BINGO_CHALLENGES.map((challenge) => {
            const submission = bingoState.submissions[challenge.id];
            const isApproved = submission?.status === 'APPROVED';
            const isPending = submission?.status === 'PENDING';
            const isRejected = submission?.status === 'REJECTED';

            let borderBg = 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 text-neutral-300';
            if (isApproved) {
              borderBg = 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 shadow-lg shadow-emerald-950/30';
            } else if (isPending) {
              borderBg = 'bg-amber-950/40 border-amber-500/80 text-amber-200 animate-pulse';
            } else if (isRejected) {
              borderBg = 'bg-red-950/40 border-red-500/70 text-red-200';
            }

            return (
              <button
                id={`bingo-sq-${challenge.id}`}
                key={challenge.id}
                onClick={() => handleOpenChallenge(challenge)}
                className={`relative aspect-square rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 flex flex-col items-center justify-between transition-all active:scale-95 group text-left overflow-hidden ${borderBg}`}
              >
                {/* Top square header: number + badge */}
                <div className="w-full flex items-center justify-between pointer-events-none">
                  <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-neutral-950/80 flex items-center justify-center text-[9px] sm:text-[10px] font-mono font-bold text-neutral-300 border border-neutral-800">
                    {challenge.number}
                  </span>
                  <span className="text-sm sm:text-base">{challenge.badgeIcon}</span>
                </div>

                {/* Challenge title excerpt */}
                <div className="w-full my-auto text-center px-0.5 sm:px-1 pointer-events-none">
                  <p className="text-[9px] sm:text-xs font-bold line-clamp-2 sm:line-clamp-3 leading-tight text-neutral-100">
                    {lang === 'ro' ? challenge.titleRo : challenge.titleEn}
                  </p>
                </div>

                {/* Status footer pill */}
                <div className="w-full flex justify-center pointer-events-none">
                  {isApproved && (
                    <span className="flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-bold text-emerald-400 bg-emerald-900/60 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> OK
                    </span>
                  )}
                  {isPending && (
                    <span className="flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-bold text-amber-400 bg-amber-900/60 px-1.5 py-0.5 rounded-full">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> PENDING
                    </span>
                  )}
                  {isRejected && (
                    <span className="flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-bold text-red-400 bg-red-900/60 px-1.5 py-0.5 rounded-full">
                      <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> RETRY
                    </span>
                  )}
                  {!submission && (
                    <span className="text-[8px] sm:text-[9px] font-mono text-neutral-500 group-hover:text-neutral-300 transition">
                      TAP
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Mobile-First List View */
        <div className="space-y-2.5">
          {CAHUL_BINGO_CHALLENGES.map((challenge) => {
            const submission = bingoState.submissions[challenge.id];
            const isApproved = submission?.status === 'APPROVED';
            const isPending = submission?.status === 'PENDING';
            const isRejected = submission?.status === 'REJECTED';

            return (
              <div
                key={challenge.id}
                onClick={() => handleOpenChallenge(challenge)}
                className={`p-3.5 rounded-2xl border transition active:scale-98 cursor-pointer flex items-center justify-between gap-3 ${
                  isApproved
                    ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-100'
                    : isPending
                    ? 'bg-amber-950/30 border-amber-500/60 text-amber-100'
                    : isRejected
                    ? 'bg-rose-950/30 border-rose-500/60 text-rose-100'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center text-xl shrink-0 border border-neutral-800">
                    {challenge.badgeIcon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        #{challenge.number}
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {lang === 'ro' ? challenge.titleRo : challenge.titleEn}
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                      {lang === 'ro' ? challenge.descRo : challenge.descEn}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isApproved ? (
                    <span className="px-2 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED
                    </span>
                  ) : isPending ? (
                    <span className="px-2 py-1 rounded-lg text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> PENDING
                    </span>
                  ) : isRejected ? (
                    <span className="px-2 py-1 rounded-lg text-xs font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> RETRY
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-black tracking-wide flex items-center gap-1 shadow"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>SNAP</span>
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Challenge Detail & Submission Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-500 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
                  {selectedChallenge.badgeIcon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      CHALLENGE #{selectedChallenge.number}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-semibold text-neutral-400 uppercase font-mono">
                      {selectedChallenge.proofType.toUpperCase()} REQUIRED
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">
                    {lang === 'ro' ? selectedChallenge.titleRo : selectedChallenge.titleEn}
                  </h3>
                </div>
              </div>
              <button
                id="btn-close-challenge-modal"
                onClick={() => setSelectedChallenge(null)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white bg-neutral-800/80 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description & Requirements */}
            <div className="space-y-3 mb-6 bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800/80">
              <div>
                <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                  {lang === 'ro' ? 'Descriere:' : 'Description:'}
                </span>
                <p className="text-sm text-neutral-200 mt-1 leading-relaxed">
                  {lang === 'ro' ? selectedChallenge.descRo : selectedChallenge.descEn}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  {lang === 'ro' ? 'Cerințe de validare:' : 'Validation Requirements:'}
                </span>
                <p className="text-xs text-neutral-300 mt-1 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                  {lang === 'ro' ? selectedChallenge.requirementsRo : selectedChallenge.requirementsEn}
                </p>
              </div>
            </div>

            {/* Existing Submission Status Alert */}
            {bingoState.submissions[selectedChallenge.id] && (
              <div className="mb-4">
                {bingoState.submissions[selectedChallenge.id].status === 'APPROVED' && (
                  <div className="p-3 bg-emerald-950/70 border border-emerald-700 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>CHALLENGE COMPLETED & APPROVED BY GAME MASTER!</span>
                  </div>
                )}
                {bingoState.submissions[selectedChallenge.id].status === 'PENDING' && (
                  <div className="p-3 bg-amber-950/70 border border-amber-700 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                    <span>WAITING FOR GAME MASTER APPROVAL...</span>
                  </div>
                )}
                {bingoState.submissions[selectedChallenge.id].status === 'REJECTED' && (
                  <div className="p-3 bg-red-950/70 border border-red-700 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      REJECTED: {bingoState.submissions[selectedChallenge.id].feedback || 'Please try again'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Proof Upload / Take Photo */}
            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold text-neutral-300 block">
                {lang === 'ro' ? 'Dovada ta (Foto / Video / Notă):' : 'Your Proof (Photo / Video / Note):'}
              </label>

              {/* Photo preview or file selector */}
              {proofImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-950 max-h-48 flex items-center justify-center">
                  <img src={proofImage} alt="Proof preview" className="object-contain max-h-48 w-full" />
                  <button
                    onClick={() => setProofImage('')}
                    className="absolute top-2 right-2 p-1 rounded-lg bg-black/70 text-white hover:bg-black transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label className="flex-1 border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-neutral-950/40 hover:bg-neutral-900/60">
                    <Camera className="w-6 h-6 text-amber-400 mb-1" />
                    <span className="text-xs font-semibold text-neutral-200">
                      {lang === 'ro' ? 'Încarcă Foto / Cameră' : 'Upload Photo / Camera'}
                    </span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">JPG, PNG, GIF</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      // Demo instant capture proof simulation
                      setProofImage(
                        `https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=60`
                      );
                    }}
                    className="px-3 py-2 border border-neutral-700 hover:border-neutral-600 rounded-2xl bg-neutral-950/40 text-[11px] text-neutral-400 hover:text-white flex flex-col items-center justify-center"
                    title="Simulate quick camera capture"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 mb-1" />
                    <span>Demo Snap</span>
                  </button>
                </div>
              )}

              {/* Note input */}
              <input
                type="text"
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder={lang === 'ro' ? 'Adaugă detalii / descriere despre locație...' : 'Add details / description...'}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedChallenge(null)}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold transition"
              >
                {lang === 'ro' ? 'Anulează' : 'Cancel'}
              </button>
              <button
                id="btn-submit-challenge-proof"
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isSubmitting ? 'Trimitere...' : (lang === 'ro' ? 'TRIMITE SPRE APROBARE' : 'SUBMIT CHALLENGE')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
