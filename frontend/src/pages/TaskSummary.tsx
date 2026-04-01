import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, Mail, ExternalLink, Zap, BookOpen, AlertCircle } from "lucide-react";

export function TaskSummary() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full w-full bg-[#f8f9fa] overflow-y-auto">
      {/* Top Header */}
      <header className="h-20 px-10 border-b border-gray-200 bg-white flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/mission-control/1")} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-2xl text-[#0a192f] tracking-tight">Project Summary Report</h1>
            <div className="text-sm font-semibold text-gray-500 flex items-center gap-2 mt-1">
              "Competitor Research Veclam24h"
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-sm font-semibold text-[#0a192f] bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button className="text-sm font-semibold text-white bg-[#0a192f] hover:bg-[#112a4f] px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
            <Mail className="w-4 h-4" /> Email Report
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full p-10 py-12 flex flex-col gap-10">
        
        {/* Execution Summary */}
        <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <CheckCircle2 className="w-40 h-40" />
          </div>
          
          <h2 className="text-sm font-bold tracking-widest text-green-600 mb-6 flex items-center gap-2 uppercase">
            <CheckCircle2 className="w-5 h-5" /> Execution Complete
          </h2>
          <div className="text-[#0a192f] text-lg font-medium leading-relaxed max-w-2xl relative z-10">
            Completed 5/6 tasks (1 skipped). <br/><br/>
            Analyzed 5 main competitors: Vietnamworks, TopCV, Careerlink, Joboko, 1900jobs. 
            <strong className="text-blue-600"> Vietnamworks leads in followers (850k FB). TopCV has the highest engagement. </strong>
            None are using TikTok — representing a significant market opportunity.
          </div>
        </section>

        {/* Results By Task */}
        <section>
          <h2 className="text-sm font-bold tracking-widest text-gray-400 mb-6 uppercase flex items-center gap-2">
            Detailed Results by Task
          </h2>
          
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between p-5 px-8 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
                <h3 className="font-bold text-[#0a192f] group-hover:text-blue-600 transition-colors">Identify top 5 competitors</h3>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                competitor_list.xlsx <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-center justify-between p-5 px-8 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
                <h3 className="font-bold text-[#0a192f] group-hover:text-blue-600 transition-colors">Collect social media data</h3>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                social_data.xlsx <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-center justify-between p-5 px-8 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
                <h3 className="font-bold text-[#0a192f] group-hover:text-blue-600 transition-colors">Analyze landing pages & UX</h3>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                ux_comparison.pdf <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-center justify-between p-5 px-8 bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center shrink-0"><AlertCircle className="w-4 h-4" /></div>
                <h3 className="font-bold text-gray-500 line-through">Analyze offline marketing</h3>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2 bg-gray-200 px-2 py-0.5 rounded">Skipped</span>
              </div>
              <div className="text-sm font-medium text-gray-400">
                User requested focus purely on digital channels.
              </div>
            </div>

          </div>
        </section>

        {/* Suggested Next Projects */}
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-[#0a192f] mb-2">Suggested Next Directions</h2>
          <p className="text-gray-500 mb-8 font-medium">Based on the research results, your Agent team suggests 3 potential follow-up projects:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white p-6 rounded-3xl border border-gray-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/10 transition-all cursor-pointer group flex flex-col h-full">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0a192f] mb-3 leading-tight group-hover:text-blue-600 transition-colors">Build a TikTok Strategy</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6 flex-1">
                No competitor is currently active on TikTok. Represents a significant first-mover advantage for VecLam24h.
              </p>
              <button className="w-full py-3 bg-gray-50 group-hover:bg-blue-600 group-hover:text-white transition-colors text-sm font-bold text-[#0a192f] rounded-xl flex items-center justify-center gap-2">
                Launch Project <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-200 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-900/10 transition-all cursor-pointer group flex flex-col h-full">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ExternalLink className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0a192f] mb-3 leading-tight group-hover:text-orange-600 transition-colors">Optimize Landing Page UX</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6 flex-1">
                TopCV demonstrated the highest conversion rate layout. Worth running an A/B test referencing their hierarchy.
              </p>
              <button className="w-full py-3 bg-gray-50 group-hover:bg-orange-600 group-hover:text-white transition-colors text-sm font-bold text-[#0a192f] rounded-xl flex items-center justify-center gap-2">
                Launch Project <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-200 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-900/10 transition-all cursor-pointer group flex flex-col h-full">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0a192f] mb-3 leading-tight group-hover:text-purple-600 transition-colors">Unique Brand Voice</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6 flex-1">
                All 5 competitors utilize the same formal tone. Creating a conversational brand voice creates instant differentiation.
              </p>
              <button className="w-full py-3 bg-gray-50 group-hover:bg-purple-600 group-hover:text-white transition-colors text-sm font-bold text-[#0a192f] rounded-xl flex items-center justify-center gap-2">
                Launch Project <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
