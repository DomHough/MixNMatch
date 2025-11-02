import {twMerge} from "tailwind-merge";

type Props = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  className?: string
  placeholder?: string
}

export default function StringInput({ value, onChange, className="", placeholder }: Props) {
  return (
    <input
      className={twMerge("bg-background rounded px-2 py-1 text-on-background", className)}
      type="string"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}