import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Edit2, Plus, ArrowLeft, RefreshCw } from 'lucide-react';
import { evaluateExpression } from '../utils/calculatorEngine';

export interface CalculationStep {
  id: string;
  op: string; // '', '+', '−', '×', '÷'
  value: string;
}

interface CheckAndCorrectModalProps {
  isOpen: boolean;
  onClose: () => void;
  equation: string;
  onApplyEquation: (newEquation: string) => void;
  theme?: 'light' | 'dark';
}

export function parseStepsFromEquation(eq: string): CalculationStep[] {
  if (!eq || eq === '0') return [];

  const regex = /([+\−\×\÷\*\/\-\^]?)\s*([0-9]+\.?[0-9]*)/g;
  const steps: CalculationStep[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(eq)) !== null) {
    let rawOp = match[1] || '';
    if (rawOp === '*') rawOp = '×';
    if (rawOp === '/') rawOp = '÷';
    if (rawOp === '-') rawOp = '−';

    const val = match[2];
    if (val) {
      steps.push({
        id: `step-${steps.length}-${Date.now()}`,
        op: rawOp,
        value: val,
      });
    }
  }

  return steps;
}

export function buildEquationFromSteps(steps: CalculationStep[]): string {
  if (steps.length === 0) return '0';
  return steps
    .map((s, idx) => {
      const op = idx === 0 ? (s.op === '−' ? '−' : '') : s.op || '+';
      return `${op}${s.value}`;
    })
    .join('');
}

export const CheckAndCorrectModal: React.FC<CheckAndCorrectModalProps> = ({
  isOpen,
  onClose,
  equation,
  onApplyEquation,
  theme = 'light',
}) => {
  const [steps, setSteps] = useState<CalculationStep[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editOp, setEditOp] = useState<string>('+');

  const isLight = theme === 'light';

  useEffect(() => {
    if (isOpen) {
      const parsed = parseStepsFromEquation(equation);
      setSteps(parsed);
      setEditingIndex(null);
      setEditValue('');
    }
  }, [isOpen, equation]);

  if (!isOpen) return null;

  // Calculate live preview of corrected steps
  const previewEquation = buildEquationFromSteps(steps);
  const previewEval = evaluateExpression(previewEquation);
  const previewTotal = previewEval.success && previewEval.result ? previewEval.result : '0';

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(steps[index].value);
    setEditOp(steps[index].op || '+');
  };

  const handleSaveEdit = (index: number) => {
    const cleanVal = editValue.trim().replace(/^0+(?=\d)/, '');
    if (!cleanVal) return;

    setSteps((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        op: index === 0 ? '' : editOp,
        value: cleanVal,
      };
      return copy;
    });
    setEditingIndex(null);
    setEditValue('');
  };

  const handleDeleteStep = (index: number) => {
    setSteps((prev) => {
      const copy = prev.filter((_, i) => i !== index);
      if (copy.length > 0 && index === 0) {
        copy[0].op = '';
      }
      return copy;
    });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleInsertStepAfter = (index: number) => {
    const newStep: CalculationStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      op: '+',
      value: '0',
    };
    setSteps((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newStep);
      return copy;
    });
    handleStartEdit(index + 1);
  };

  const handleApply = () => {
    const finalEq = buildEquationFromSteps(steps);
    onApplyEquation(finalEq);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border ${
          isLight ? 'bg-white text-stone-900 border-stone-200' : 'bg-[#18181b] text-white border-stone-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Edit2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">ભૂલ સુધારો (Check & Correct)</h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                વચ્ચે કોઈપણ નંબર કે ચિહ્ન બદલો અથવા કાઢી નાખો
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Total Banner */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/40">
          <div>
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">સુધારેલો કુલ સરવાળો (Total):</span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
              ₹{previewTotal}
            </div>
          </div>
          <div className="text-right text-xs text-stone-500 font-mono">
            {steps.length} રકમો (Items)
          </div>
        </div>

        {/* Step-by-Step List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {steps.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              કોઈ ગણતરી નથી. કેલ્સીમાં નંબર દાખલ કરો.
            </div>
          ) : (
            steps.map((step, idx) => {
              const isEditing = editingIndex === idx;

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl p-3 border transition-all ${
                    isEditing
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : isLight
                      ? 'bg-stone-50 hover:bg-stone-100/80 border-stone-200'
                      : 'bg-stone-900/60 hover:bg-stone-900 border-stone-800'
                  }`}
                >
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          સ્ટેપ #{idx + 1} સુધારો
                        </span>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="text-xs text-stone-400 hover:text-stone-600"
                        >
                          રદ કરો
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {idx > 0 && (
                          <div className="flex gap-1 bg-stone-200 dark:bg-stone-800 p-1 rounded-xl">
                            {['+', '−', '×', '÷'].map((op) => (
                              <button
                                key={op}
                                type="button"
                                onClick={() => setEditOp(op)}
                                className={`w-8 h-8 rounded-lg font-bold text-sm transition-colors ${
                                  editOp === op
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'text-stone-600 dark:text-stone-300'
                                }`}
                              >
                                {op}
                              </button>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))}
                          className="flex-1 px-3 py-2 text-xl font-bold rounded-xl border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-none"
                          placeholder="નંબર દાખલ કરો"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleSaveEdit(idx)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>સાચવો (OK)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-[10px] font-bold text-stone-500">
                          {idx + 1}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          {step.op && (
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                              {step.op}
                            </span>
                          )}
                          <span className="text-xl font-semibold tracking-tight">
                            {step.value}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(idx)}
                          className="p-2 rounded-xl text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          title="સુધારો (Edit)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleInsertStepAfter(idx)}
                          className="p-2 rounded-xl text-stone-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="વચ્ચે નવો નંબર ઉમેરો (+ Add after)"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(idx)}
                          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="કાઢી નાખો (Delete)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-900/50">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-sm active:bg-stone-200 dark:active:bg-stone-800 transition-colors"
          >
            રદ કરો (Cancel)
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>સુધારો લાગુ કરો (Apply)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
