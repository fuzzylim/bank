"use client"

import { useState } from "react"
import Content from "./content"
import Layout from "./layout"
import { InfoModal } from "@/components/info-modal"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

export default function Dashboard() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

  return (
    <Layout>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={() => setIsInfoModalOpen(true)}>
          <Info className="w-4 h-4 mr-2" />
          Integration Status
        </Button>
      </div>
      <Content />
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </Layout>
  )
}

