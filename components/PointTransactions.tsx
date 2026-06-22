import { ArrowDownLeft, ArrowUpRight, Gift, ReceiptText } from 'lucide-react'

export interface PointTransaction {
  id: string
  title: string
  detail: string
  amount: number
  date: string
  type: 'bet' | 'winnings' | 'reward'
  status?: string
}

interface PointTransactionsProps {
  transactions: PointTransaction[]
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Em processamento',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export default function PointTransactions({ transactions }: PointTransactionsProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
          <ReceiptText className="h-4 w-4 text-indigo-400" />
          Transações de pontos
        </h2>
        <p className="mt-1 text-xs text-zinc-500">Apostas, ganhos e prémios resgatados.</p>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/20 p-12 text-center text-xs text-zinc-500">
          Ainda não existem transações de pontos.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30">
          {transactions.map((transaction) => {
            const isCredit = transaction.amount > 0
            const Icon = transaction.type === 'reward' ? Gift : isCredit ? ArrowUpRight : ArrowDownLeft

            return (
              <article
                key={transaction.id}
                className="flex flex-col gap-3 border-b border-zinc-800/70 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-bold text-zinc-200">{transaction.title}</h3>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-500">{transaction.detail}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <div className="text-right">
                    {transaction.status && (
                      <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                        {statusLabels[transaction.status] || transaction.status}
                      </p>
                    )}
                    <time className="text-[10px] text-zinc-600">
                      {new Date(transaction.date).toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <span className={`min-w-24 text-right text-sm font-black ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCredit ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} PTS
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
