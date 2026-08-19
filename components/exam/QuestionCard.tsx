'use client';

import React from 'react';
import { Question } from '@/types';
import { Check } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  questionNumber: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  questionNumber,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      {/* Reading Passage if available */}
      {question.reading_passage && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm leading-relaxed space-y-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Reading Passage
          </span>
          <p>{question.reading_passage}</p>
        </div>
      )}

      {/* Question Header & Text */}
      <div className="space-y-2">
        <div className="inline-block px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold capitalize">
          {question.section} • {question.difficulty}
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
          <span className="text-indigo-600 mr-2">{questionNumber}.</span>
          {question.question_text}
        </h2>
      </div>

      {/* Options List */}
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectOption(opt.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold uppercase transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                  }`}
                >
                  {opt.id}
                </span>
                <span className="text-sm sm:text-base">{opt.text}</span>
              </div>

              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                  isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
