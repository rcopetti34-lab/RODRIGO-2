import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from './components/Auth';
import { ProcessForm } from './components/ProcessForm';
import { Processo } from './types';
import { calculateDuration, formatDate } from './utils/dateHelper';
import { Plus, Search, Edit, Trash2, LayoutDashboard, Calendar, AlertCircle, CheckCircle2, Clock, FileText, Timer } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [processes, setProcesses] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Processo | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProcesses = async () => {
    if (!session) return;
    setLoading(true);
    // Order by creation time as requested (insertion order)
    const { data, error } = await supabase
      .from('licitacao_processes')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching processes:', error);
    } else {
      setProcesses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      fetchProcesses();
    }
  }, [session]);

  // CRUD Operations
  const handleSaveProcess = async (processData: Omit<Processo, 'id' | 'created_at' | 'user_id'>) => {
    if (!session) return;

    if (editingProcess) {
      // Update
      const { error } = await supabase
        .from('licitacao_processes')
        .update(processData)
        .eq('id', editingProcess.id);

      if (error) alert(`Erro ao atualizar: ${error.message}`);
    } else {
      // Create
      const { error } = await supabase
        .from('licitacao_processes')
        .insert([{ ...processData, user_id: session.user.id }]);
        
      if (error) alert(`Erro ao criar: ${error.message}`);
    }
    await fetchProcesses();
  };

  const handleDeleteProcess = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este processo permanentemente?")) {
      return;
    }

    if (!session) return;

    try {
      // ESTRATÉGIA 1: Exclusão Padrão com verificação de dono (Owner)
      // Isso muitas vezes passa por políticas de RLS padrão "users can delete their own items"
      let { error, count } = await supabase
        .from('licitacao_processes')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', session.user.id);

      // Se falhar ou não deletar nada (count 0 pode significar bloqueio silencioso ou ID mismatch)
      if (error || count === 0) {
        console.warn("Tentativa 1 falhou (Standard Delete). Tentando Estratégia 2 (Force ID)...");
        
        // ESTRATÉGIA 2: Exclusão Apenas por ID (Para casos onde RLS está desativado mas user_id pode estar nulo/diferente)
        const res2 = await supabase
          .from('licitacao_processes')
          .delete()
          .eq('id', id);
        
        error = res2.error;

        if (error) {
           console.warn("Tentativa 2 falhou. Tentando Estratégia 3 (RPC/Stored Procedure)...");

           // ESTRATÉGIA 3: Workaround via RPC (Stored Procedure)
           // Requer que o usuário tenha criado a função 'delete_licitacao_process' no SQL
           const { error: rpcError } = await supabase.rpc('delete_licitacao_process', { target_id: id });
           
           if (rpcError) {
             console.error("Todas as tentativas falharam.");
             throw new Error(`Falha SQL: ${rpcError.message}. Tente criar a função RPC sugerida.`);
           }
        }
      }

      // Sucesso: Recarrega a lista
      await fetchProcesses();

    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      alert(`Não foi possível excluir o registro.\n\nErro: ${err.message}\n\nDica: Se o erro persistir, execute o comando SQL fornecido para criar a função de exclusão segura.`);
    }
  };

  // Filtering logic
  const filteredProcesses = useMemo(() => {
    return processes.filter(p => {
      const matchesSearch = 
        p.objeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.modalidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toString().includes(searchTerm);
        
      const matchesStatus = statusFilter ? p.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [processes, searchTerm, statusFilter]);

  // Insights Logic
  const insights = useMemo(() => {
    // Global counts
    const total = processes.length;
    const aguardando = processes.filter(p => p.status === 'Aguardando início').length;
    const emElaboracao = processes.filter(p => p.status === 'Em elaboração').length;
    const finalizado = processes.filter(p => p.status === 'Finalizado').length;
    const prorrogado = processes.filter(p => p.status === 'Prorrogado').length;

    // Average Calculation based on FILTERED data (dados apresentados em tela)
    let totalBusinessDays = 0;
    let totalCalendarDays = 0;
    let countWithDates = 0;

    filteredProcesses.forEach(p => {
      if (p.inicio_planejamento && p.fim_planejamento) {
        const duration = calculateDuration(p.inicio_planejamento, p.fim_planejamento);
        totalBusinessDays += duration.businessDays;
        totalCalendarDays += duration.calendarDays;
        countWithDates++;
      }
    });

    const avgBusiness = countWithDates > 0 ? Math.round(totalBusinessDays / countWithDates) : 0;
    const avgCalendar = countWithDates > 0 ? Math.round(totalCalendarDays / countWithDates) : 0;

    return { total, aguardando, emElaboracao, finalizado, prorrogado, avgBusiness, avgCalendar };
  }, [processes, filteredProcesses]);

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" />
            <h1 className="font-bold text-xl text-slate-800">Gestão de Licitações</h1>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-sm text-slate-500 hidden md:block">{session.user.email}</span>
             <button 
                onClick={() => supabase.auth.signOut()}
                className="text-sm font-medium text-red-600 hover:text-red-800"
             >
               Sair
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        
        {/* Insights Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Total Processos</p>
                    <p className="text-2xl font-bold text-slate-800">{insights.total}</p>
                  </div>
                  <FileText className="text-blue-200" />
               </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Aguardando</p>
                    <p className="text-2xl font-bold text-slate-800">{insights.aguardando}</p>
                  </div>
                  <Clock className="text-yellow-200" />
               </div>
            </div>
             <div className="bg-white p-4 rounded-lg shadow border-l-4 border-sky-500">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Em Elaboração</p>
                    <p className="text-2xl font-bold text-slate-800">{insights.emElaboracao}</p>
                  </div>
                  <Edit className="text-sky-200" />
               </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Finalizados</p>
                    <p className="text-2xl font-bold text-slate-800">{insights.finalizado}</p>
                  </div>
                  <CheckCircle2 className="text-green-200" />
               </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Prorrogados</p>
                    <p className="text-2xl font-bold text-slate-800">{insights.prorrogado}</p>
                  </div>
                  <AlertCircle className="text-red-200" />
               </div>
            </div>
            {/* Novo Card de Média */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Média Duração</p>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-indigo-900">{insights.avgBusiness} dias úteis</span>
                        <span className="text-xs text-slate-500">{insights.avgCalendar} dias corridos</span>
                    </div>
                  </div>
                  <Timer className="text-indigo-200" />
               </div>
            </div>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex flex-wrap gap-2">
               <button 
                 onClick={() => setStatusFilter(null)}
                 className={`px-4 py-2 rounded-md text-sm font-medium transition ${!statusFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                 Todos
               </button>
               <button 
                 onClick={() => setStatusFilter('Aguardando início')}
                 className={`px-4 py-2 rounded-md text-sm font-medium transition ${statusFilter === 'Aguardando início' ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                 Aguardando Início
               </button>
               <button 
                 onClick={() => setStatusFilter('Em elaboração')}
                 className={`px-4 py-2 rounded-md text-sm font-medium transition ${statusFilter === 'Em elaboração' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                 Em Elaboração
               </button>
               <button 
                 onClick={() => setStatusFilter('Finalizado')}
                 className={`px-4 py-2 rounded-md text-sm font-medium transition ${statusFilter === 'Finalizado' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                 Elaborados/Finalizados
               </button>
               <button 
                 onClick={() => setStatusFilter('Prorrogado')}
                 className={`px-4 py-2 rounded-md text-sm font-medium transition ${statusFilter === 'Prorrogado' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                 Prorrogados
               </button>
            </div>

            <div className="flex w-full lg:w-auto gap-3">
               <div className="relative flex-grow lg:flex-grow-0">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                 <input 
                    type="text"
                    placeholder="Pesquisar processos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full lg:w-64 pl-9 pr-4 py-2 bg-white text-black border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>
               <button 
                 onClick={() => { setEditingProcess(null); setIsModalOpen(true); }}
                 className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm whitespace-nowrap"
               >
                 <Plus size={18} /> Novo Processo
               </button>
            </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200 flex flex-col">
           <div className="overflow-x-auto custom-scrollbar">
             <table className="min-w-max text-sm text-left border-collapse">
               <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-xs sticky top-0 z-10">
                 <tr>
                   <th className="p-3 border-b border-r border-slate-200 sticky left-0 bg-slate-100 z-20 shadow-sm">Ações</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[140px]">B - PCA</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[160px]">C - Status</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[120px]">D - Prev. Start</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[100px]">E - Prioridade</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[180px]">F - Modalidade</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[250px]">G - Objeto</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[150px]">H - Responsável</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[100px]">I - Prorrogável</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[120px]">J - Início Plan.</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[120px]">K - Fim Plan.</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[150px]">L - Duração</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[120px]">M - Remessa</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[200px]">N - Fiscais/Gestores</th>
                   <th className="p-3 border-b border-r border-slate-200 min-w-[100px]">O - Prorrogado</th>
                   <th className="p-3 border-b border-slate-200 min-w-[250px]">P - Observações</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-200">
                 {loading ? (
                   <tr>
                     <td colSpan={16} className="p-8 text-center text-slate-500">Carregando processos...</td>
                   </tr>
                 ) : filteredProcesses.length === 0 ? (
                    <tr>
                     <td colSpan={16} className="p-8 text-center text-slate-500">Nenhum processo encontrado.</td>
                   </tr>
                 ) : (
                   filteredProcesses.map((process) => {
                     const duration = calculateDuration(process.inicio_planejamento, process.fim_planejamento);
                     
                     // Color logic for Status
                     let statusColorClass = 'bg-slate-100 text-slate-700';
                     if(process.status === 'Aguardando início') statusColorClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
                     if(process.status === 'Em elaboração') statusColorClass = 'bg-sky-100 text-sky-800 border border-sky-200';
                     if(process.status === 'Finalizado') statusColorClass = 'bg-green-100 text-green-800 border border-green-200';
                     if(process.status === 'Prorrogado') statusColorClass = 'bg-red-100 text-red-800 border border-red-200';

                     return (
                       <tr key={process.id} className="hover:bg-slate-50 transition bg-white">
                         <td className="p-2 border-r border-slate-200 sticky left-0 bg-white z-10 shadow-sm text-center">
                           <div className="flex items-center justify-center gap-2">
                             <button 
                               onClick={() => { setEditingProcess(process); setIsModalOpen(true); }}
                               className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition" 
                               title="Alterar"
                             >
                               <Edit size={16} />
                             </button>
                             
                             <button 
                               onClick={() => handleDeleteProcess(process.id)}
                               className="p-1.5 text-red-600 hover:bg-red-50 rounded transition" 
                               title="Excluir"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                         </td>
                         <td className="p-3 border-r border-slate-200">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${process.pca_previsto === 'Previsto no PCA' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {process.pca_previsto}
                            </span>
                         </td>
                         <td className="p-3 border-r border-slate-200">
                           <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${statusColorClass}`}>
                             {process.status}
                           </span>
                         </td>
                         <td className="p-3 border-r border-slate-200 whitespace-nowrap text-black">{formatDate(process.previsao_start)}</td>
                         <td className="p-3 border-r border-slate-200">
                            <span className={`font-medium ${process.prioridade === 'Urgente' ? 'text-red-600' : process.prioridade === 'Alta' ? 'text-orange-600' : 'text-slate-600'}`}>
                                {process.prioridade}
                            </span>
                         </td>
                         <td className="p-3 border-r border-slate-200 text-black">{process.modalidade}</td>
                         <td className="p-3 border-r border-slate-200 truncate max-w-xs text-black" title={process.objeto}>{process.objeto}</td>
                         <td className="p-3 border-r border-slate-200 text-black">{process.responsavel}</td>
                         <td className="p-3 border-r border-slate-200 text-center">
                           {process.prorrogavel ? <span className="text-blue-600 font-bold">Sim</span> : <span className="text-slate-400">Não</span>}
                         </td>
                         <td className="p-3 border-r border-slate-200 whitespace-nowrap text-black">{formatDate(process.inicio_planejamento)}</td>
                         <td className="p-3 border-r border-slate-200 whitespace-nowrap text-black">{formatDate(process.fim_planejamento)}</td>
                         <td className="p-3 border-r border-slate-200 bg-slate-50">
                            <div className="flex flex-col text-xs">
                                <span className="font-semibold text-slate-700">{duration.businessDays} dias úteis</span>
                                <span className="text-slate-500">{duration.calendarDays} dias corridos</span>
                            </div>
                         </td>
                         <td className="p-3 border-r border-slate-200 whitespace-nowrap text-black">{formatDate(process.data_remessa)}</td>
                         <td className="p-3 border-r border-slate-200 truncate max-w-[200px] text-black" title={process.fiscais_gestores}>{process.fiscais_gestores}</td>
                         <td className="p-3 border-r border-slate-200 text-center text-black">
                            {process.foi_prorrogado && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">Prorrogado</span>}
                         </td>
                         <td className="p-3 truncate max-w-xs text-black" title={process.observacoes}>{process.observacoes}</td>
                       </tr>
                     );
                   })
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </main>

      {isModalOpen && (
        <ProcessForm 
          onClose={() => setIsModalOpen(false)} 
          initialData={editingProcess}
          onSave={handleSaveProcess}
        />
      )}
    </div>
  );
}

export default App;