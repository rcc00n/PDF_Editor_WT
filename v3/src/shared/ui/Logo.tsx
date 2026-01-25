import { cn } from './cn'
import logo from '@/assets/wolsey-tech-logo.svg'

type LogoProps = {
  className?: string
  alt?: string
}

export default function Logo({ className, alt = 'Wolsey Tech logo' }: LogoProps) {
  return <img src={logo} alt={alt} className={cn('h-10 w-auto', className)} />
}
