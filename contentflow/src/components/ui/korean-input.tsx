"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type CommitHandler = (value: string) => void

type KoreanInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "defaultValue" | "onChange"
> & {
  value: string
  onCommit: CommitHandler
  commitOnEnter?: boolean
}

function KoreanInput({
  value,
  onCommit,
  commitOnEnter = true,
  onBlur,
  onKeyDown,
  ...props
}: KoreanInputProps) {
  return (
    <Input
      key={value}
      defaultValue={value}
      onBlur={(e) => {
        if (e.target.value !== value) onCommit(e.target.value)
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (commitOnEnter && e.key === "Enter") {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        }
        onKeyDown?.(e)
      }}
      {...props}
    />
  )
}

type KoreanTextareaProps = Omit<
  React.ComponentProps<typeof Textarea>,
  "value" | "defaultValue" | "onChange"
> & {
  value: string
  onCommit: CommitHandler
}

function KoreanTextarea({
  value,
  onCommit,
  onBlur,
  ...props
}: KoreanTextareaProps) {
  return (
    <Textarea
      key={value}
      defaultValue={value}
      onBlur={(e) => {
        if (e.target.value !== value) onCommit(e.target.value)
        onBlur?.(e)
      }}
      {...props}
    />
  )
}

export { KoreanInput, KoreanTextarea }
