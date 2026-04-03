"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Mic, Search, Database, Fingerprint, Layers, Cpu, Code2, Play } from "lucide-react";
import { useRef } from "react";
import { BlurText } from "@/components/ui/blur-text";
import { ShinyText } from "@/components/ui/shiny-text";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"]
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col text-foreground" ref={ref}>
      {/* Abstract Background Sub-glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 blur-[120px] rounded-[100%]"
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 w-full max-w-7xl mx-auto border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Mic className="w-4 h-4 text-background" />
          </div>
          <span className="text-foreground font-medium text-lg tracking-tight">Vocalize</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300">
            Login
          </Link>
          <Link href="/dashboard" className="px-5 py-2.5 text-sm font-medium rounded-md bg-foreground text-background hover:bg-muted-foreground transition-all duration-200 shadow-sm">
            Start Building
          </Link>
        </div>
      </nav>

      <main className="flex flex-col z-10 items-center">
        {/* --- 1. HERO SECTION --- */}
        <section className="relative w-full max-w-7xl mx-auto flex flex-col items-center justify-center pt-24 pb-32 px-4 text-center">
          <motion.div
            style={{ scale, opacity }}
            className="flex flex-col items-center max-w-4xl"
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-border bg-muted/30 backdrop-blur-md"
            >
              <ShinyText text="✨ Introducing Voice RAG Pipelines ->" className="text-xs font-semibold tracking-wide text-foreground" />
            </motion.div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl font-medium tracking-tighter text-foreground pb-6 leading-[1.1]">
              <BlurText text="Build Voice Forms" delay={0.1} />
              <BlurText text="That Listen & Learn." delay={0.2} className="justify-center text-muted-foreground" />
            </h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-2xl text-lg md:text-xl text-muted-foreground font-light leading-relaxed mb-10"
            >
              Deploy autonomous voice assistants grounded instantly in your proprietary knowledge base. Skip the RAG pipeline boilerplate entirely.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Link href="/dashboard">
                <Button className="h-12 px-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium text-base">
                  Deploy Free Framework
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" className="h-12 px-8 rounded-md border-border bg-transparent text-foreground hover:bg-muted transition-all font-medium text-base">
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* --- 2. HOW IT WORKS --- */}
        <section className="w-full relative border-y border-border bg-muted/20 py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-24">
              <h2 className="text-3xl md:text-5xl font-medium tracking-tighter mb-4 text-foreground">How Vocalize Works</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg flex items-center justify-center">A unified pipeline from document ingestion to real-time voice synthesis.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {/* Pipeline Connecting Line */}
              <div className="absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent hidden md:block" />

              <PipelineStep 
                num="01"
                icon={<Database />}
                title="Ingest Documents"
                desc="Upload your PDFs, JSON, and Markdowns. We automatically chunk and index them."
                delay={0}
              />
              <PipelineStep 
                num="02"
                icon={<Layers />}
                title="Vectorize Context"
                desc="Your data is instantly embedded into our ultra-fast low-latency vector network."
                delay={0.1}
              />
              <PipelineStep 
                num="03"
                icon={<Cpu />}
                title="LLM Synthesis"
                desc="Queries run through state-of-the-art LLMs securely anchored to your ground truth."
                delay={0.2}
              />
               <PipelineStep 
                num="04"
                icon={<Mic />}
                title="Voice Streaming"
                desc="The synthesized answer is streamed back as lifelike text-to-speech audio."
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* --- 3. WHY WE BUILT IT --- */}
        <section className="w-full py-24 md:py-32 bg-background px-6">
          <div className="max-w-7xl mx-auto">
             <div className="mb-20 max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-medium tracking-tighter mb-6 text-foreground">The End of Scripted Chatbots.</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Traditional support bots rely on rigid decision trees that break immediately upon complex inquiries. 
                By utilizing dynamic Retrieval-Augmented Generation (RAG) hooked directly to voice streaming, your agents answer 
                fluidly and accurately based exclusively on reality.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeatureCard 
                icon={<Search className="w-5 h-5" />}
                title="Guaranteed Accuracy & Citations"
                desc="Every single sentence the agent speaks is linked directly to a source document. If it doesn't know, it won't hallucinate."
              />
              <FeatureCard 
                icon={<Fingerprint className="w-5 h-5" />}
                title="Granular Persona Control"
                desc="Inject highly specific system prompts. Dictate the tone, language, verbosity, and behavior boundaries of the AI."
              />
              <FeatureCard 
                icon={<Code2 className="w-5 h-5" />}
                title="API-First Infrastructure"
                desc="Use our simple SDK to embed the voice agent into your React, iOS, or Android application in less than 10 lines of code."
              />
              <FeatureCard 
                icon={<Mic className="w-5 h-5" />}
                title="Sub-second Latency"
                desc="Interruption handling and ultra-low latency TTS ensuring conversations feel identical to a human operator."
              />
            </div>
          </div>
        </section>

        {/* --- 4. CONTACT / CTA SECTION --- */}
        <section className="w-full py-24 md:py-32 px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto bg-card border border-border rounded-2xl p-12 text-center shadow-lg"
          >
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-card-foreground mb-4">Ready to upgrade your Support?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join thousands of developers using Vocalize to build unshakeable Voice Agents. Get started for free, or contact us for enterprise logic.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
               <input 
                 type="email" 
                 placeholder="Enter your work email" 
                 className="w-full bg-background border border-input rounded-md px-4 h-11 text-foreground text-sm outline-none focus:border-ring transition-colors"
               />
               <Button className="w-full sm:w-auto h-11 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium text-sm whitespace-nowrap">
                  Get Early Access
               </Button>
            </div>
          </motion.div>
        </section>

      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground mt-auto">
        <p>© 2026 Vocalize AI Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}

function PipelineStep({ num, icon, title, desc, delay }: { num: string; icon: React.ReactNode; title: string; desc: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay }}
      className="relative z-10 flex flex-col items-center text-center group"
    >
      <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-6 group-hover:text-foreground group-hover:border-ring group-hover:scale-105 transition-all shadow-md">
        {icon}
      </div>
      <div className="text-xs font-mono text-muted-foreground mb-2">{num}</div>
      <h4 className="text-lg font-medium text-foreground mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">{desc}</p>
    </motion.div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-8 rounded-2xl bg-card border border-border hover:border-ring transition-colors shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center text-foreground mb-6">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground font-light text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
