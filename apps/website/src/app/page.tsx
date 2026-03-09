import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Hero } from '@/components/sections/hero'
import { Problem } from '@/components/sections/problem'
import { Solution } from '@/components/sections/solution'
import { Features } from '@/components/sections/features'
import { ProductDemo } from '@/components/sections/product-demo'
import { HowItWorks } from '@/components/sections/how-it-works'
import { SocialProof } from '@/components/sections/social-proof'
import { FinalCta } from '@/components/sections/final-cta'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <ProductDemo />
        <HowItWorks />
        <SocialProof />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
