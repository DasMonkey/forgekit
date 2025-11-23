import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Sparkles, 
  Layers, 
  Scissors, 
  Hammer, 
  Palette, 
  Gem, 
  Baby, 
  Swords,
  ArrowRight,
  Github as GithubIcon,
  Zap
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const categories = [
    { name: 'Papercraft', icon: Scissors, color: 'from-blue-500 to-cyan-500' },
    { name: 'Clay', icon: Palette, color: 'from-orange-500 to-amber-500' },
    { name: 'Fabric/Sewing', icon: Layers, color: 'from-pink-500 to-rose-500' },
    { name: 'Costume & Props', icon: Sparkles, color: 'from-purple-500 to-indigo-500' },
    { name: 'Woodcraft', icon: Hammer, color: 'from-amber-600 to-yellow-600' },
    { name: 'Jewelry', icon: Gem, color: 'from-emerald-500 to-teal-500' },
    { name: 'Kids Crafts', icon: Baby, color: 'from-red-500 to-pink-500' },
    { name: 'Tabletop Figures', icon: Swords, color: 'from-slate-500 to-zinc-500' },
  ];

  const parallaxOffset = scrollY * 0.5;
  const mouseParallaxX = (mousePosition.x - window.innerWidth / 2) * 0.02;
  const mouseParallaxY = (mousePosition.y - window.innerHeight / 2) * 0.02;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #334155 1px, transparent 1px),
              linear-gradient(to bottom, #334155 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            transform: `translate(${mouseParallaxX}px, ${mouseParallaxY}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />
        
        {/* Gradient Orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"
          style={{ transform: `translate(${-parallaxOffset}px, ${parallaxOffset * 0.5}px)` }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"
          style={{ transform: `translate(${parallaxOffset}px, ${-parallaxOffset * 0.5}px)` }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="max-w-6xl mx-auto text-center z-10">
          {/* Logo */}
          <div 
            className="inline-flex items-center gap-4 mb-8 animate-in fade-in slide-in-from-top duration-700"
            style={{ transform: `translateY(${parallaxOffset * 0.3}px)` }}
          >
            <Box className="w-16 h-16 text-indigo-500" strokeWidth={1.5} />
            <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-r from-slate-100 via-indigo-200 to-emerald-200 bg-clip-text text-transparent">
              Craftus
            </h1>
          </div>

          {/* Tagline */}
          <h2 
            className="text-5xl md:text-6xl font-bold mb-6 leading-tight animate-in fade-in slide-in-from-bottom duration-700 delay-150"
            style={{ transform: `translateY(${parallaxOffset * 0.2}px)` }}
          >
            Dissect your imagination.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Build reality.
            </span>
          </h2>

          {/* Subtext */}
          <p 
            className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-700 delay-300"
            style={{ transform: `translateY(${parallaxOffset * 0.15}px)` }}
          >
            Resurrecting the lost art of craft instruction sheets — with AI.
            Transform your ideas into visual, step-by-step masterpieces.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/canvas')}
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-900/50 hover:shadow-indigo-900/80 transition-all duration-300 hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom duration-700 delay-500"
            style={{ transform: `translateY(${parallaxOffset * 0.1}px)` }}
          >
            <Sparkles className="w-6 h-6" />
            Start Crafting
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 blur-xl opacity-50 group-hover:opacity-75 transition-opacity -z-10" />
          </button>

          {/* Scroll Indicator */}
          <div 
            className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce"
            style={{ opacity: Math.max(0, 1 - scrollY / 300) }}
          >
            <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex items-start justify-center p-2">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 
            className="text-4xl font-bold text-center mb-20 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent"
            style={{ 
              opacity: Math.min(1, Math.max(0, (scrollY - 300) / 200)),
              transform: `translateY(${Math.max(0, 50 - (scrollY - 300) * 0.2)}px)`
            }}
          >
            How It Works
          </h3>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: '01',
                title: 'Describe It',
                description: 'Type your craft idea and choose a category. Our AI understands your vision.',
                icon: Sparkles,
                delay: 0,
              },
              {
                step: '02',
                title: 'See It',
                description: 'Watch as a studio-quality master reference image materializes before your eyes.',
                icon: Zap,
                delay: 200,
              },
              {
                step: '03',
                title: 'Build It',
                description: 'Get isolated step cards with knolled visuals, just like classic instruction sheets.',
                icon: Layers,
                delay: 400,
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className="relative group"
                style={{
                  opacity: Math.min(1, Math.max(0, (scrollY - 500 - index * 100) / 200)),
                  transform: `translateY(${Math.max(0, 80 - (scrollY - 500 - index * 100) * 0.3)}px)`,
                }}
              >
                {/* Card */}
                <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 h-full transition-all duration-500 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-900/20 hover:-translate-y-2">
                  {/* Step Number */}
                  <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-indigo-600 to-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    {item.step}
                  </div>

                  {/* Icon */}
                  <div className="mb-6 mt-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <item.icon className="w-8 h-8 text-indigo-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <h4 className="text-2xl font-bold mb-4 text-slate-100">{item.title}</h4>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>

                  {/* Hover Glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600/0 to-emerald-600/0 group-hover:from-indigo-600/5 group-hover:to-emerald-600/5 transition-all duration-500 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 
            className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 1200) / 200)),
              transform: `translateY(${Math.max(0, 50 - (scrollY - 1200) * 0.2)}px)`
            }}
          >
            Supported Craft Categories
          </h3>
          <p 
            className="text-center text-slate-400 mb-16 text-lg"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 1250) / 200)),
            }}
          >
            From paper to pixels, clay to code — we've got you covered
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <div
                key={category.name}
                className="group relative"
                style={{
                  opacity: Math.min(1, Math.max(0, (scrollY - 1400 - index * 50) / 150)),
                  transform: `translateY(${Math.max(0, 60 - (scrollY - 1400 - index * 50) * 0.4)}px) scale(${Math.min(1, Math.max(0.9, 0.9 + (scrollY - 1400 - index * 50) / 500))})`,
                }}
              >
                <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 aspect-square flex flex-col items-center justify-center text-center transition-all duration-500 hover:border-slate-700 hover:shadow-2xl hover:-translate-y-2 cursor-pointer">
                  {/* Icon with gradient background */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${category.color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                      <category.icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Name */}
                  <h4 className="font-bold text-slate-100 text-sm">{category.name}</h4>

                  {/* Hover Glow */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase Section */}
      <section className="relative py-32 px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <h3 
            className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 2000) / 200)),
              transform: `translateY(${Math.max(0, 50 - (scrollY - 2000) * 0.2)}px)`
            }}
          >
            Powered by AI, Built for Makers
          </h3>
          <p 
            className="text-center text-slate-400 mb-16 text-lg"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 2050) / 200)),
            }}
          >
            Everything you need to transform ideas into reality
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Studio-Quality Images',
                description: 'Generate photorealistic reference images with proper lighting, textures, and materials using Gemini 3 Pro.',
                gradient: 'from-indigo-500 to-purple-500',
              },
              {
                title: 'Extreme Isolation',
                description: 'Each step shows only the components you need, eliminating confusion with knolled layouts and macro views.',
                gradient: 'from-emerald-500 to-teal-500',
              },
              {
                title: 'Infinite Canvas',
                description: 'Spatial workspace with pan, zoom, and drag. Arrange your project visually the way you think.',
                gradient: 'from-orange-500 to-red-500',
              },
              {
                title: 'Smart Dissection',
                description: 'AI analyzes complexity, extracts materials, and breaks down construction into logical steps automatically.',
                gradient: 'from-blue-500 to-cyan-500',
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="group relative"
                style={{
                  opacity: Math.min(1, Math.max(0, (scrollY - 2200 - index * 100) / 200)),
                  transform: `translateY(${Math.max(0, 60 - (scrollY - 2200 - index * 100) * 0.3)}px)`,
                }}
              >
                <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 h-full transition-all duration-500 hover:border-slate-700 hover:shadow-2xl hover:-translate-y-2">
                  <div className={`w-12 h-1 rounded-full bg-gradient-to-r ${feature.gradient} mb-6`} />
                  <h4 className="text-2xl font-bold mb-4 text-slate-100">{feature.title}</h4>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 
            className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 2800) / 200)),
              transform: `translateY(${Math.max(0, 50 - (scrollY - 2800) * 0.2)}px)`
            }}
          >
            Simple, Transparent Pricing
          </h3>
          <p 
            className="text-center text-slate-400 mb-16 text-lg"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 2850) / 200)),
            }}
          >
            Start creating for free, upgrade when you need more
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                description: 'Perfect for trying out Craftus',
                features: [
                  '5 projects per month',
                  'All 8 craft categories',
                  'Basic step images',
                  'Local storage',
                  'Community access',
                ],
                cta: 'Start Free',
                highlighted: false,
              },
              {
                name: 'Pro',
                price: '$12',
                period: 'per month',
                description: 'For serious makers and creators',
                features: [
                  'Unlimited projects',
                  'All 8 craft categories',
                  'HD step images',
                  'Cloud storage & sync',
                  'Priority generation',
                  'Export to PDF',
                  'Community publishing',
                ],
                cta: 'Go Pro',
                highlighted: true,
              },
              {
                name: 'Team',
                price: '$39',
                period: 'per month',
                description: 'For workshops and studios',
                features: [
                  'Everything in Pro',
                  'Up to 10 team members',
                  'Shared workspaces',
                  'Collaboration tools',
                  'Custom branding',
                  'Priority support',
                ],
                cta: 'Contact Sales',
                highlighted: false,
              },
            ].map((plan, index) => (
              <div
                key={plan.name}
                className={`group relative ${plan.highlighted ? 'md:-mt-4' : ''}`}
                style={{
                  opacity: Math.min(1, Math.max(0, (scrollY - 3000 - index * 100) / 200)),
                  transform: `translateY(${Math.max(0, 60 - (scrollY - 3000 - index * 100) * 0.3)}px) scale(${plan.highlighted ? 1.05 : 1})`,
                }}
              >
                <div className={`relative bg-slate-900/50 backdrop-blur-sm border ${plan.highlighted ? 'border-indigo-500' : 'border-slate-800'} rounded-2xl p-8 h-full transition-all duration-500 hover:border-slate-700 hover:shadow-2xl hover:-translate-y-2`}>
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-full text-sm font-bold">
                      Most Popular
                    </div>
                  )}
                  
                  <h4 className="text-2xl font-bold mb-2 text-slate-100">{plan.name}</h4>
                  <div className="mb-4">
                    <span className="text-5xl font-black text-slate-100">{plan.price}</span>
                    <span className="text-slate-400 ml-2">/ {plan.period}</span>
                  </div>
                  <p className="text-slate-400 mb-8">{plan.description}</p>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-slate-300">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${plan.highlighted ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 hover:shadow-lg hover:shadow-indigo-900/50' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-32 px-6 bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <h3 
            className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 3800) / 200)),
              transform: `translateY(${Math.max(0, 50 - (scrollY - 3800) * 0.2)}px)`
            }}
          >
            Frequently Asked Questions
          </h3>
          <p 
            className="text-center text-slate-400 mb-16 text-lg"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 3850) / 200)),
            }}
          >
            Everything you need to know about Craftus
          </p>

          <div className="space-y-6">
            {[
              {
                question: 'How does Craftus generate the images?',
                answer: 'Craftus uses Google\'s Gemini 3 Pro image generation model to create studio-quality reference images and isolated step visuals. The AI understands craft materials, textures, and construction techniques to produce accurate, helpful instructions.',
              },
              {
                question: 'Can I use Craftus offline?',
                answer: 'The canvas and saved projects work offline, but generating new images requires an internet connection to access the AI models. Your projects are saved locally in your browser.',
              },
              {
                question: 'What craft categories are supported?',
                answer: 'Craftus supports 8 categories: Papercraft, Clay, Fabric/Sewing, Costume & Props, Woodcraft, Jewelry, Kids Crafts, and Tabletop Figures. Each category has specialized visual rules for optimal instruction clarity.',
              },
              {
                question: 'Can I export my projects?',
                answer: 'Pro users can export projects as PDF instruction booklets with all images and steps. Free users can save projects locally and share them via the community gallery.',
              },
              {
                question: 'Is there a limit to project complexity?',
                answer: 'The AI can handle projects of any complexity, from simple kids crafts to intricate tabletop miniatures. More complex projects will generate more detailed step-by-step instructions automatically.',
              },
              {
                question: 'How accurate are the generated images?',
                answer: 'The AI is trained on millions of craft images and understands material properties, textures, and construction techniques. While highly accurate, we recommend using the images as guides and adapting to your specific materials.',
              },
            ].map((faq, index) => (
              <div
                key={faq.question}
                className="group"
                style={{
                  opacity: Math.min(1, Math.max(0, (scrollY - 4000 - index * 80) / 200)),
                  transform: `translateY(${Math.max(0, 40 - (scrollY - 4000 - index * 80) * 0.3)}px)`,
                }}
              >
                <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 transition-all duration-500 hover:border-slate-700 hover:shadow-xl">
                  <h4 className="text-xl font-bold mb-3 text-slate-100">{faq.question}</h4>
                  <p className="text-slate-400 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 px-6">
        <div 
          className="max-w-4xl mx-auto text-center"
          style={{
            opacity: Math.min(1, Math.max(0, (scrollY - 4800) / 300)),
            transform: `translateY(${Math.max(0, 80 - (scrollY - 4800) * 0.3)}px)`
          }}
        >
          <div className="relative bg-gradient-to-br from-indigo-900/30 to-emerald-900/30 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-16 overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #6366f1 25%, transparent 25%),
                    linear-gradient(-45deg, #6366f1 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #10b981 75%),
                    linear-gradient(-45deg, transparent 75%, #10b981 75%)
                  `,
                  backgroundSize: '40px 40px',
                  backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
                  animation: 'slide 20s linear infinite',
                }}
              />
            </div>

            <h3 className="text-5xl font-bold mb-6 relative z-10">
              Ready to bring your ideas to life?
            </h3>
            <p className="text-xl text-slate-300 mb-10 relative z-10">
              Join the future of craft instruction. No signup required.
            </p>
            <button
              onClick={() => navigate('/canvas')}
              className="group relative inline-flex items-center gap-3 px-12 py-6 bg-white text-slate-900 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 active:scale-95 z-10"
            >
              <Box className="w-6 h-6" />
              Launch Workbench
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Box className="w-8 h-8 text-indigo-500" />
            <span className="font-bold text-lg">Craftus</span>
          </div>

          <div className="flex items-center gap-8 text-sm text-slate-400">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-slate-200 transition-colors"
            >
              <GithubIcon className="w-5 h-5" />
              GitHub
            </a>
            <span>Built with Kiro & Gemini</span>
          </div>
        </div>
      </footer>

      {/* CSS Animation */}
      <style>{`
        @keyframes slide {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
      `}</style>
    </div>
  );
};
