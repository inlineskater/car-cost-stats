import { formatDate, formatDateShort } from '@/lib/utils'

// Full date on wider screens, compact dd.MM.yy on phones.
export default function DateCell({ date }: { date: string }) {
  return (
    <>
      <span className="sm:hidden">{formatDateShort(date)}</span>
      <span className="hidden sm:inline">{formatDate(date)}</span>
    </>
  )
}
