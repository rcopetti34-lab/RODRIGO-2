import React, { useEffect, useState } from 'react';
import { Processo } from '../types';
import { X } from 'lucide-react';

interface ProcessFormProps {
  initialData?: Processo | null;
  onClose: () => void;
  onSave: (processo: Omit<Processo, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
}

export const ProcessForm: React.FC<ProcessFormProps> = ({ initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<Processo, 'id' | 'created_at' | 'user_id'>>({
    pca_previsto: 'Previsto no PCA',
    status: 'Aguardando início',
    previsao_start: null,
    prioridade: 'Normal',
    modalidade: '',
    objeto: '',
    responsavel: '',
    prorrogavel: false,
    inicio_planejamento: null,
    fim_planejamento: null,
    data_remessa: null,
    fiscais_gestores: '',
    foi_prorrogado: false,
    observacoes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      const { id, created_at, user_id, ...rest } = initialData;
      setFormData(rest);
    }
  }, [initialData]);

  // Automate Status Logic
  useEffect(() => {
    const j = formData.inicio_planejamento; // Coluna J
    const k = formData.fim_planejamento;    // Coluna K (Used in logic context, though M is the trigger for Finalizado)
    const m = formData.data_remessa;        // Coluna M
    const o = formData.foi_prorrogado;      // Coluna O

    let newStatus: 'Aguardando início' | 'Em elaboração' | 'Finalizado' | 'Prorrogado' = 'Aguardando início';

    // Priority 1: Prorrogado (O)
    if (o) {
      newStatus = 'Prorrogado';
    }
    // Priority 2: Finalizado (M) - Se houver lançamento na M
    else if (m) {
      newStatus = 'Finalizado';
    }
    // Priority 3: Em elaboração (J) - Se houver na J (e tecnicamente não na K, mas sem M ainda não finalizou)
    else if (j) {
      newStatus = 'Em elaboração';
    }
    // Default: Aguardando início (Se não houver J)
    else {
      newStatus = 'Aguardando início';
    }

    // Update state only if different to avoid infinite loops
    if (formData.status !== newStatus) {
      setFormData(prev => ({ ...prev, status: newStatus }));
    }
  }, [
    formData.inicio_planejamento,
    formData.fim_planejamento,
    formData.data_remessa,
    formData.foi_prorrogado
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving", error);
      alert("Erro ao salvar processo.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Alterar Processo' : 'Novo Processo'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Row 1: Status & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Previsto no PCA (B)</label>
              <select
                value={formData.pca_previsto}
                onChange={(e) => handleChange('pca_previsto', e.target.value)}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="Previsto no PCA">Previsto no PCA</option>
                <option value="Não previsto no PCA">Não previsto no PCA</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status Geral (C) <span className="text-slate-400 font-normal normal-case">(Automático)</span></label>
              <select
                value={formData.status}
                disabled={true}
                className="w-full p-2.5 bg-slate-100 text-slate-600 border border-slate-300 rounded cursor-not-allowed font-semibold"
              >
                <option value="Aguardando início">Aguardando início</option>
                <option value="Em elaboração">Em elaboração</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Prorrogado">Prorrogado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Prioridade (E)</label>
              <select
                value={formData.prioridade}
                onChange={(e) => handleChange('prioridade', e.target.value)}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* Row 2: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Previsão Start (D)</label>
              <input
                type="date"
                value={formData.previsao_start || ''}
                onChange={(e) => handleChange('previsao_start', e.target.value || null)}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Início Planejamento (J)</label>
              <input
                type="date"
                value={formData.inicio_planejamento || ''}
                onChange={(e) => handleChange('inicio_planejamento', e.target.value || null)}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fim Planejamento (K)</label>
              <input
                type="date"
                value={formData.fim_planejamento || ''}
                onChange={(e) => handleChange('fim_planejamento', e.target.value || null)}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data Remessa (M)</label>
              <input
                type="date"
                value={formData.data_remessa || ''}
                onChange={(e) => handleChange('data_remessa', e.target.value || null)}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Modalidade (F)</label>
              <select
                value={formData.modalidade}
                onChange={(e) => handleChange('modalidade', e.target.value)}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                <option value="Pregão Eletrônico">Pregão Eletrônico</option>
                <option value="Concorrência">Concorrência</option>
                <option value="Dispensa">Dispensa</option>
                <option value="Inexigibilidade">Inexigibilidade</option>
                <option value="Leilão">Leilão</option>
                <option value="Diálogo Competitivo">Diálogo Competitivo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Responsável (H)</label>
              <input
                type="text"
                value={formData.responsavel}
                onChange={(e) => handleChange('responsavel', e.target.value)}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do servidor"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Objeto (G)</label>
            <textarea
              value={formData.objeto}
              onChange={(e) => handleChange('objeto', e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição do objeto da licitação..."
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fiscais e Gestores (N)</label>
             <input
                type="text"
                value={formData.fiscais_gestores}
                onChange={(e) => handleChange('fiscais_gestores', e.target.value)}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Nomes separados por vírgula"
              />
          </div>

          {/* Row 4: Checks & Obs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="prorrogavel"
                  checked={formData.prorrogavel}
                  onChange={(e) => handleChange('prorrogavel', e.target.checked)}
                  className="w-5 h-5 bg-white border-slate-300 rounded text-blue-600"
                />
                <label htmlFor="prorrogavel" className="text-sm font-medium text-slate-700">É Prorrogável? (I)</label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="foi_prorrogado"
                  checked={formData.foi_prorrogado}
                  onChange={(e) => handleChange('foi_prorrogado', e.target.checked)}
                  className="w-5 h-5 bg-white border-slate-300 rounded text-red-600"
                />
                <label htmlFor="foi_prorrogado" className="text-sm font-medium text-red-700">PRORROGADO (O)</label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Observações Gerais (P)</label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                rows={2}
                className="w-full p-2.5 bg-white text-black border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition flex items-center gap-2"
            >
              {loading ? 'Salvando...' : 'Salvar Processo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};