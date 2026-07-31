import { labelBase } from './styles'

interface Props {
  label: string
  children: React.ReactNode
}

// Label + control pairing (replaces the inline <label> + input blocks).
export default function Field({ label, children }: Props) {
  return (
    <div>
      <label className={labelBase}>{label}</label>
      {children}
    </div>
  )
}
