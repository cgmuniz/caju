"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🥜</span>
          <span className="text-xl font-bold">CajuHost</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/new">
            <Button className="gap-2">
              <span>+</span>
              Nova Hospedagem
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
