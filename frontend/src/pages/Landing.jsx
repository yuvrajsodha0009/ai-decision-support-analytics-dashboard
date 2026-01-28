import { useNavigate } from "react-router-dom";
import { BarChart3, Sparkles, TrendingUp, Database, Shield, Zap, ArrowRight, Star, LineChart, PieChart as PieChartIcon, Activity, CheckCircle } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Premium animated background with vibrant gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-96 -right-96 w-[800px] h-[800px] bg-gradient-to-br from-cyan-500/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-96 -left-96 w-[800px] h-[800px] bg-gradient-to-tr from-teal-500/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-b from-blue-500/20 via-transparent to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-400 via-blue-500 to-teal-500 rounded-2xl shadow-lg shadow-cyan-500/50">
            <BarChart3 className="text-white" size={28} />
          </div>
          <div>
            <span className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 bg-clip-text text-transparent">Analytics</span>
            <p className="text-xs text-cyan-300 font-semibold">Enterprise Platform</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/auth")}
          className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-full font-bold hover:shadow-lg hover:shadow-cyan-400/50 transition-all duration-300 hover:scale-105"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 backdrop-blur-md border border-cyan-400/40 rounded-full">
              <Star size={16} className="text-cyan-300 animate-pulse" />
              <span className="text-sm font-semibold text-cyan-200">The Future of Data Analytics</span>
            </div>

            {/* Main Title */}
            <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-teal-300 bg-clip-text text-transparent leading-tight">
              Enterprise-Grade Analytics
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed font-light">
              Experience the power of real-time insights with AI-driven analytics. Transform your data into strategic advantage and unlock new opportunities.
            </p>

            {/* Feature List */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-cyan-400 flex-shrink-0" />
                <span className="text-slate-300">Real-time dashboards with live data updates</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-cyan-400 flex-shrink-0" />
                <span className="text-slate-300">Multi-source data integration (CSV, API, Database)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-cyan-400 flex-shrink-0" />
                <span className="text-slate-300">Advanced security & enterprise compliance</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-cyan-400 flex-shrink-0" />
                <span className="text-slate-300">99.9% uptime guarantee with 24/7 support</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <button
                onClick={() => navigate("/auth")}
                className="group relative px-8 py-4 bg-gradient-to-r from-cyan-400 to-teal-500 text-black rounded-xl font-bold text-lg overflow-hidden shadow-2xl hover:shadow-cyan-500/70 transition-all duration-300 hover:scale-105"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Get Started Free
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>

            {/* Trust Line */}
            <div className="pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                <span className="text-cyan-300 font-semibold">✓</span> Trusted by 10,000+ companies • Enterprise Security • 99.9% Uptime • 150+ Countries
              </p>
            </div>
          </div>

          {/* Right Visual - Dashboard Preview */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 rounded-3xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-xl border border-cyan-400/30 rounded-3xl p-8 shadow-2xl">
              <div className="space-y-4">
                {/* Mock Dashboard Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-600">
                  <h3 className="font-bold text-cyan-300">Sales Dashboard</h3>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  </div>
                </div>

                {/* Mock Chart Container */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg p-4 h-40 flex items-center justify-center">
                    <div className="flex items-end gap-2 h-24">
                      <div className="w-4 bg-gradient-to-t from-cyan-400 to-cyan-300 h-12 rounded-t"></div>
                      <div className="w-4 bg-gradient-to-t from-cyan-400 to-cyan-300 h-20 rounded-t"></div>
                      <div className="w-4 bg-gradient-to-t from-cyan-400 to-cyan-300 h-16 rounded-t"></div>
                      <div className="w-4 bg-gradient-to-t from-cyan-400 to-cyan-300 h-24 rounded-t"></div>
                    </div>
                  </div>

                  {/* Mock Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3 border border-cyan-400/20">
                      <p className="text-xs text-slate-400">Revenue</p>
                      <p className="text-xl font-bold text-cyan-300">$245K</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3 border border-teal-400/20">
                      <p className="text-xs text-slate-400">Growth</p>
                      <p className="text-xl font-bold text-teal-300">+28%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
          <div className="group bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-md border border-cyan-400/30 rounded-2xl p-8 hover:border-cyan-400/60 transition-all duration-300 hover:-translate-y-2 shadow-lg hover:shadow-cyan-500/20">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform shadow-lg">
              <LineChart size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-cyan-300">Real-Time Analytics</h3>
            <p className="text-slate-400">Live dashboards with instant data updates and predictive insights powered by AI</p>
          </div>

          <div className="group bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-md border border-purple-400/30 rounded-2xl p-8 hover:border-purple-400/60 transition-all duration-300 hover:-translate-y-2 shadow-lg hover:shadow-purple-500/20">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform shadow-lg">
              <Database size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-purple-300">Multi-Source Integration</h3>
            <p className="text-slate-400">Connect CSV, APIs, databases, and cloud services with seamless data flow</p>
          </div>

          <div className="group bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-md border border-green-400/30 rounded-2xl p-8 hover:border-green-400/60 transition-all duration-300 hover:-translate-y-2 shadow-lg hover:shadow-green-500/20">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform shadow-lg">
              <Shield size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-green-300">Enterprise Security</h3>
            <p className="text-slate-400">Bank-level encryption and compliance with GDPR, SOC 2, and ISO 27001</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 rounded-2xl p-12 border border-cyan-400/20 backdrop-blur-md">
          <div className="text-center">
            <h4 className="text-5xl font-black bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">10M+</h4>
            <p className="text-slate-300 mt-3 font-medium">Data Points Processed Daily</p>
          </div>
          <div className="text-center">
            <h4 className="text-5xl font-black bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">99.9%</h4>
            <p className="text-slate-300 mt-3 font-medium">Platform Uptime Guaranteed</p>
          </div>
          <div className="text-center">
            <h4 className="text-5xl font-black bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">150+</h4>
            <p className="text-slate-300 mt-3 font-medium">Countries Supported Globally</p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-24">
          <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">Why Choose Analytics?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4 p-6 bg-slate-700/30 rounded-xl border border-slate-600/50 hover:border-cyan-400/40 transition">
              <div className="p-3 bg-cyan-500/30 rounded-lg h-fit">
                <Activity size={24} className="text-cyan-300" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-2">Instant Insights</h4>
                <p className="text-slate-400">Get actionable insights in seconds, not hours</p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-slate-700/30 rounded-xl border border-slate-600/50 hover:border-cyan-400/40 transition">
              <div className="p-3 bg-cyan-500/30 rounded-lg h-fit">
                <Zap size={24} className="text-cyan-300" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-2">Lightning Fast</h4>
                <p className="text-slate-400">Process millions of data points instantly</p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-slate-700/30 rounded-xl border border-slate-600/50 hover:border-cyan-400/40 transition">
              <div className="p-3 bg-cyan-500/30 rounded-lg h-fit">
                <TrendingUp size={24} className="text-cyan-300" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-2">Drive Growth</h4>
                <p className="text-slate-400">Make data-driven decisions that matter</p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-slate-700/30 rounded-xl border border-slate-600/50 hover:border-cyan-400/40 transition">
              <div className="p-3 bg-cyan-500/30 rounded-lg h-fit">
                <Sparkles size={24} className="text-cyan-300" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-2">AI Powered</h4>
                <p className="text-slate-400">Intelligent predictions and recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative z-10 bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-md border-t border-slate-700 mt-32">
        <div className="max-w-6xl mx-auto px-8 py-16 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Ready to Transform Your Data?</h2>
          <p className="text-slate-300 mb-8 text-lg">Join thousands of companies making smarter decisions with our platform</p>
          <button
            onClick={() => navigate("/auth")}
            className="px-10 py-4 bg-gradient-to-r from-cyan-400 to-teal-500 text-black rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 inline-flex items-center gap-2 hover:scale-105"
          >
            Start Free Trial Today
            <Zap size={20} />
          </button>
          <p className="text-slate-400 mt-6 text-sm">No credit card required • Get started in minutes</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
