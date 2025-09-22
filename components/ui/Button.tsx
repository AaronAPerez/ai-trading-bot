import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  ...props
}) => {
  const base = 'px-4 py-2 rounded font-medium transition'
  const styles = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'

  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  )
}

