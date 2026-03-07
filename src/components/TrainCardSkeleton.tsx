// src/components/TrainCardSkeleton.tsx

export default function TrainCardSkeleton() {
  return (
    <div className="bg-white/80 rounded-2xl p-4 border border-slate-100 shadow-sm mb-3 animate-pulse">
      <div className="flex justify-between items-start gap-4">
        {/* Lato Sinistro: Categoria, Numero, Destinazione */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-16 h-4 bg-slate-200 rounded"></div>
            <div className="w-12 h-4 bg-slate-200 rounded"></div>
          </div>
          <div className="w-3/4 md:w-48 h-6 bg-slate-200 rounded mt-1"></div>
        </div>

        {/* Lato Destro: Orario, Ritardo */}
        <div className="flex flex-col items-end shrink-0">
          <div className="w-16 h-8 bg-slate-200 rounded mb-2"></div>
          <div className="w-20 h-4 bg-slate-200 rounded-full"></div>
        </div>
      </div>

      {/* Riga Inferiore: Binario e Bottone */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
        <div className="flex flex-col gap-1.5">
          <div className="w-12 h-3 bg-slate-200 rounded"></div>
          <div className="w-6 h-6 bg-slate-200 rounded"></div>
        </div>
        <div className="w-24 h-8 bg-slate-200 rounded-xl"></div>
      </div>
    </div>
  );
}
