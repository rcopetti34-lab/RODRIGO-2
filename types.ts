
export interface Processo {
  id: string;
  created_at: string;
  user_id: string;
  
  // Coluna B
  pca_previsto: 'Previsto no PCA' | 'Não previsto no PCA';
  
  // Coluna C (Derived logic in UI often, but stored for persistence)
  status: 'Aguardando início' | 'Em elaboração' | 'Finalizado' | 'Prorrogado';
  
  // Coluna D
  previsao_start: string | null; // Date
  
  // Coluna E
  prioridade: 'Normal' | 'Alta' | 'Urgente';
  
  // Coluna F
  modalidade: string;
  
  // Coluna G
  objeto: string;
  
  // Coluna H
  responsavel: string;
  
  // Coluna I
  prorrogavel: boolean;
  
  // Coluna J
  inicio_planejamento: string | null; // Date
  
  // Coluna K
  fim_planejamento: string | null; // Date
  
  // Coluna M
  data_remessa: string | null; // Date
  
  // Coluna N
  fiscais_gestores: string;
  
  // Coluna O
  foi_prorrogado: boolean;
  
  // Coluna P
  observacoes: string;

  // Controle de Exclusão Lógica
  cancelado?: boolean;
}

export interface DateCalculation {
  businessDays: number;
  calendarDays: number;
}
