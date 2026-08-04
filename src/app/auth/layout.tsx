export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="orb w-96 h-96 top-[-15%] left-[-10%]" style={{ background: 'rgba(143,99,247,0.35)' }} />
      <div className="orb w-80 h-80 bottom-[-20%] right-[-8%]" style={{ background: 'rgba(167,139,250,0.25)' }} />
      <div className="orb w-56 h-56 bottom-[10%] left-[15%]" style={{ background: 'rgba(52,211,153,0.12)' }} />

      <div className="relative z-10 w-full max-w-md">
        <div
          className="rounded-3xl p-8 glass-strong"
          style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 80px rgba(143,99,247,0.15)' }}
        >
          {children}
        </div>
        <p className="text-center text-xs text-brand-dark-text-subtle mt-6">
          TwinLab Digital Twin Platform
        </p>
      </div>
    </div>
  )
}
