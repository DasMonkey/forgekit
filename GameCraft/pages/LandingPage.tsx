import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  Sparkles,
  Layers,
  Grid3X3,
  Image,
  Paintbrush,
  Shapes,
  Box,
  Pencil,
  ArrowRight,
  Github as GithubIcon,
  Play,
  Wand2
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
    { name: 'Pixel Art', icon: Grid3X3, color: 'from-purple-500 to-fuchsia-500' },
    { name: 'HD Sprite', icon: Image, color: 'from-cyan-500 to-blue-500' },
    { name: 'Chibi Style', icon: Sparkles, color: 'from-pink-500 to-rose-500' },
    { name: 'Anime Style', icon: Paintbrush, color: 'from-violet-500 to-purple-500' },
    { name: 'Realistic', icon: Layers, color: 'from-emerald-500 to-teal-500' },
    { name: 'Low Poly 3D', icon: Shapes, color: 'from-orange-500 to-amber-500' },
    { name: 'Voxel Art', icon: Box, color: 'from-red-500 to-pink-500' },
    { name: 'Hand-Drawn', icon: Pencil, color: 'from-indigo-500 to-blue-500' },
  ];

  const parallaxOffset = scrollY * 0.5;
  const mouseParallaxX = (mousePosition.x - window.innerWidth / 2) * 0.02;
  const mouseParallaxY = (mousePosition.y - window.innerHeight / 2) * 0.02;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Animated Background Grid - Gaming Pixel Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `
              linear-gradient(to right, #f59e0b 1px, transparent 1px),
              linear-gradient(to bottom, #f59e0b 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            transform: `translate(${mouseParallaxX}px, ${mouseParallaxY}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />

        {/* Scanline Effect */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245, 158, 11, 0.03) 2px, rgba(245, 158, 11, 0.03) 4px)',
          }}
        />

        {/* Gradient Orbs - Gaming Amber/Orange */}
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl"
          style={{ transform: `translate(${-parallaxOffset}px, ${parallaxOffset * 0.5}px)` }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl"
          style={{ transform: `translate(${parallaxOffset}px, ${-parallaxOffset * 0.5}px)` }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-600/15 rounded-full blur-3xl"
          style={{ transform: `translate(${parallaxOffset * 0.5}px, ${parallaxOffset * 0.3}px)` }}
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
            <Gamepad2 className="w-16 h-16 text-amber-500" strokeWidth={1.5} />
            <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-r from-zinc-100 via-amber-200 to-orange-200 bg-clip-text text-transparent">
              GameCraft
            </h1>
          </div>

          {/* Tagline */}
          <h2
            className="text-5xl md:text-6xl font-bold mb-6 leading-tight animate-in fade-in slide-in-from-bottom duration-700 delay-150"
            style={{ transform: `translateY(${parallaxOffset * 0.2}px)` }}
          >
            One character.
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Infinite possibilities.
            </span>
          </h2>

          {/* Subtext */}
          <p
            className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-700 delay-300"
            style={{ transform: `translateY(${parallaxOffset * 0.15}px)` }}
          >
            Transform your character concepts into production-ready game assets.
            Sprite sheets, turntables, and animation frames — powered by AI.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/canvas')}
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl font-bold text-lg text-zinc-900 shadow-2xl shadow-amber-900/50 hover:shadow-amber-900/80 transition-all duration-300 hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom duration-700 delay-500"
            style={{ transform: `translateY(${parallaxOffset * 0.1}px)` }}
          >
            <Play className="w-6 h-6" />
            Start Creating
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />

            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 blur-xl opacity-50 group-hover:opacity-75 transition-opacity -z-10" />
          </button>

          {/* Scroll Indicator */}
          <div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce"
            style={{ opacity: Math.max(0, 1 - scrollY / 300) }}
          >
            <div className="w-6 h-10 border-2 border-zinc-600 rounded-full flex items-start justify-center p-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
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
                title: 'Upload',
                description: 'Drop in your character reference image. Our AI analyzes pose, style, and details.',
                icon: Image,
                delay: 0,
              },
              {
                step: '02',
                title: 'Generate',
                description: 'Choose your output type — sprite sheets, turntables, or animation frames.',
                icon: Wand2,
                delay: 200,
              },
              {
                step: '03',
                title: 'Export',
                description: 'Download production-ready assets with transparent backgrounds, ready for your game engine.',
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
                <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 h-full transition-all duration-500 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-900/20 hover:-translate-y-2">
                  {/* Step Number */}
                  <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center font-black text-2xl text-zinc-900 shadow-xl rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    {item.step}
                  </div>

                  {/* Icon */}
                  <div className="mb-6 mt-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <item.icon className="w-8 h-8 text-amber-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <h4 className="text-2xl font-bold mb-4 text-zinc-100">{item.title}</h4>
                  <p className="text-zinc-400 leading-relaxed">{item.description}</p>

                  {/* Hover Glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-600/0 to-orange-600/0 group-hover:from-amber-600/5 group-hover:to-orange-600/5 transition-all duration-500 pointer-events-none" />
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
            className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 1200) / 200)),
              transform: `translateY(${Math.max(0, 50 - (scrollY - 1200) * 0.2)}px)`
            }}
          >
            Supported Art Styles
          </h3>
          <p
            className="text-center text-zinc-400 mb-16 text-lg"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 1250) / 200)),
            }}
          >
            From retro pixel art to modern HD sprites — choose your aesthetic
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
                <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 aspect-square flex flex-col items-center justify-center text-center transition-all duration-500 hover:border-zinc-700 hover:shadow-2xl hover:-translate-y-2 cursor-pointer">
                  {/* Icon with gradient background */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${category.color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="w-full h-full bg-zinc-900 rounded-xl flex items-center justify-center">
                      <category.icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Name */}
                  <h4 className="font-bold text-zinc-100 text-sm">{category.name}</h4>

                  {/* Hover Glow */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase Section */}
      <section className="relative py-32 px-6 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <h3
            className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 2000) / 200)),
              transform: `translateY(${Math.max(0, 50 - (scrollY - 2000) * 0.2)}px)`
            }}
          >
            Built for Game Developers
          </h3>
          <p
            className="text-center text-zinc-400 mb-16 text-lg"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 2050) / 200)),
            }}
          >
            Everything you need to bring characters to life
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Turn Table Views',
                description: 'Generate 8-direction character views from a single reference. Perfect for top-down RPGs and isometric games.',
                gradient: 'from-amber-500 to-orange-500',
              },
              {
                title: 'Sprite Sheets',
                description: 'Export animation-ready sprite sheets with consistent sizing and spacing. Compatible with Unity, Godot, and more.',
                gradient: 'from-orange-500 to-red-500',
              },
              {
                title: 'Infinite Canvas',
                description: 'Organize all your character assets in one spatial workspace. Pan, zoom, and arrange visually.',
                gradient: 'from-yellow-500 to-amber-500',
              },
              {
                title: 'Style Preservation',
                description: 'AI maintains your character\'s unique style across all generated assets. Consistent look, every time.',
                gradient: 'from-amber-600 to-yellow-500',
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
                <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 h-full transition-all duration-500 hover:border-zinc-700 hover:shadow-2xl hover:-translate-y-2">
                  <div className={`w-12 h-1 rounded-full bg-gradient-to-r ${feature.gradient} mb-6`} />
                  <h4 className="text-2xl font-bold mb-4 text-zinc-100">{feature.title}</h4>
                  <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
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
            className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 2800) / 200)),
              transform: `translateY(${Math.max(0, 50 - (scrollY - 2800) * 0.2)}px)`
            }}
          >
            Simple, Transparent Pricing
          </h3>
          <p
            className="text-center text-zinc-400 mb-16 text-lg"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 2850) / 200)),
            }}
          >
            Start creating for free, scale as you ship
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                description: 'Perfect for trying out GameCraft',
                features: [
                  '3 characters per month',
                  'All 8 art styles',
                  'Basic sprite exports',
                  'Local storage',
                  'Community access',
                ],
                cta: 'Start Free',
                highlighted: false,
              },
              {
                name: 'Pro',
                price: '$15',
                period: 'per month',
                description: 'For indie devs and solo creators',
                features: [
                  'Unlimited characters',
                  'All 8 art styles',
                  'HD sprite sheets',
                  'Cloud storage & sync',
                  'Priority generation',
                  '8-direction turntables',
                  'Animation frame export',
                ],
                cta: 'Go Pro',
                highlighted: true,
              },
              {
                name: 'Studio',
                price: '$49',
                period: 'per month',
                description: 'For teams and game studios',
                features: [
                  'Everything in Pro',
                  'Up to 10 team members',
                  'Shared asset libraries',
                  'Batch generation',
                  'Custom style training',
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
                <div className={`relative bg-zinc-900/50 backdrop-blur-sm border ${plan.highlighted ? 'border-amber-500' : 'border-zinc-800'} rounded-2xl p-8 h-full transition-all duration-500 hover:border-zinc-700 hover:shadow-2xl hover:-translate-y-2`}>
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full text-sm font-bold text-zinc-900">
                      Most Popular
                    </div>
                  )}

                  <h4 className="text-2xl font-bold mb-2 text-zinc-100">{plan.name}</h4>
                  <div className="mb-4">
                    <span className="text-5xl font-black text-zinc-100">{plan.price}</span>
                    <span className="text-zinc-400 ml-2">/ {plan.period}</span>
                  </div>
                  <p className="text-zinc-400 mb-8">{plan.description}</p>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-zinc-300">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${plan.highlighted ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-zinc-900 hover:shadow-lg hover:shadow-amber-900/50' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-32 px-6 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <h3
            className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 3800) / 200)),
              transform: `translateY(${Math.max(0, 50 - (scrollY - 3800) * 0.2)}px)`
            }}
          >
            Frequently Asked Questions
          </h3>
          <p
            className="text-center text-zinc-400 mb-16 text-lg"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 3850) / 200)),
            }}
          >
            Everything you need to know about GameCraft
          </p>

          <div className="space-y-6">
            {[
              {
                question: 'How does GameCraft generate character assets?',
                answer: 'GameCraft uses advanced AI image generation to analyze your character reference and produce consistent assets across multiple views and poses. The AI understands proportions, style, and details to maintain character identity.',
              },
              {
                question: 'What image formats are supported for export?',
                answer: 'We export PNG with transparent backgrounds by default, perfect for game engines. Pro users can also export sprite sheets in various grid configurations compatible with Unity, Godot, Unreal, and other engines.',
              },
              {
                question: 'Can I use generated assets commercially?',
                answer: 'Yes! All assets generated with GameCraft are yours to use in commercial projects. You own full rights to your creations, including for games you sell.',
              },
              {
                question: 'How accurate are the character turntables?',
                answer: 'Our AI maintains consistent proportions and style across all 8 directions. While highly accurate, we recommend reviewing and making small adjustments for production-critical assets.',
              },
              {
                question: 'Can I generate animations?',
                answer: 'Pro users can generate basic animation frames (idle, walk, run) from a single reference. The AI creates in-between frames while preserving your character\'s style.',
              },
              {
                question: 'What art styles work best?',
                answer: 'GameCraft excels at stylized art — pixel art, anime, chibi, and clean vector styles produce the best results. Highly detailed realistic styles may require more iteration.',
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
                <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 transition-all duration-500 hover:border-zinc-700 hover:shadow-xl">
                  <h4 className="text-xl font-bold mb-3 text-zinc-100">{faq.question}</h4>
                  <p className="text-zinc-400 leading-relaxed">{faq.answer}</p>
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
          <div className="relative bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-16 overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #f59e0b 25%, transparent 25%),
                    linear-gradient(-45deg, #f59e0b 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #ea580c 75%),
                    linear-gradient(-45deg, transparent 75%, #ea580c 75%)
                  `,
                  backgroundSize: '40px 40px',
                  backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
                  animation: 'slide 20s linear infinite',
                }}
              />
            </div>

            <h3 className="text-5xl font-bold mb-6 relative z-10">
              Ready to level up your game assets?
            </h3>
            <p className="text-xl text-zinc-300 mb-10 relative z-10">
              Join thousands of game developers creating with AI. No signup required.
            </p>
            <button
              onClick={() => navigate('/canvas')}
              className="group relative inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-900 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-amber-500/30 transition-all duration-300 hover:scale-105 active:scale-95 z-10"
            >
              <Gamepad2 className="w-6 h-6" />
              Launch Studio
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-zinc-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-amber-500" />
            <span className="font-bold text-lg">GameCraft</span>
          </div>

          <div className="flex items-center gap-8 text-sm text-zinc-400">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-zinc-200 transition-colors"
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
