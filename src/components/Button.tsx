import type {ReactNode} from "react";
import {twMerge} from "tailwind-merge";

type Props = {
  children: ReactNode | string
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void
  variant?: "primary" | "background" | "surface"
  className?: string

}
export default function Button({ children, onClick = () => {}, variant="primary", className="" }: Props) {
  const defaultStyle = "rounded-xl py-2 px-4 flex flex-row items-center"
  const colorVariants = {
    "primary": "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
    "background": "bg-background text-on-background hover:bg-background-hover active:bg-background-active",
    "surface": "bg-surface text-on-surface hover:bg-on-surface hover:text-surface"
  }
  return (
    <button
      onClick={onClick}
      className={twMerge(defaultStyle, colorVariants[variant], className)}
    >
      {children}
    </button>
  )
}