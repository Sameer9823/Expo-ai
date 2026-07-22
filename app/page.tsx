import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { CTA, Footer } from "@/components/landing/CTA";
import { ProductPreview } from "@/components/landing/ProductOverview";

export default function Home() {
  return (
    <main className="min-h-screen bg-base">
      <Nav />
      <Hero />
      <ProductPreview/>
      <HowItWorks />
      <Features />
      <CTA />
      <Footer />
    </main>
  );
}
