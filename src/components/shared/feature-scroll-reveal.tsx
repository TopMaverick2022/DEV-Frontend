import React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { Calendar, ListTodo, Github, Code2, Bug, Layers, Activity, FileText, ShieldAlert } from "lucide-react";

// Exact 9 Core Developer Execution System tools as requested
const features = [
  { id: "project-planner", title: "AI Project Planner", description: "Turn ideas into structured development plans instantly.", image: "/images/project_planner_simple_1773916080450.png", icon: Calendar },
  { id: "architecture-advisor", title: "Architecture Advisor", description: "AI designs scalable architecture for your project.", image: "/images/architecture_advisor.png", icon: Layers }, 
  { id: "debug-assistant", title: "AI Debugging Assistant", description: "Fix bugs faster with AI-powered debugging.", image: "/images/debug_assistant_simple_1773916154254.png", icon: Bug },
  { id: "code-explainer", title: "Code Explainer", description: "Understand complex code instantly.", image: "/images/ai_reviewer_simple_1773916138979.png", icon: FileText },
  { id: "performance-analyzer", title: "Performance Analyzer", description: "Optimize performance automatically.", image: "/images/performance_analyzer.png", icon: Activity }, 
  { id: "feature-tracker", title: "Feature Tracker", description: "Track your entire development lifecycle.", image: "/images/feature_planner_simple_1773916096734.png", icon: ListTodo },
  { id: "github-integration", title: "GitHub Integration", description: "Connect your GitHub repo and let AI understand your project.", image: "/images/github_inter_simple_1773916110111.png", icon: Github },
  { id: "edge-case-detector", title: "Edge Case Detector", description: "Detect hidden bugs before production.", image: "/images/edge_case_simple_1774240688521.png", icon: ShieldAlert },
  { id: "ai-code-refactoring", title: "AI Code Refactoring", description: "Refactor code intelligently.", image: "/images/ai_refactor_simple_1774240708714.png", icon: Code2 }
];

// Reusable 3D Tilt Card wrapper
const TiltCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [0, 1], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [0, 1], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
    >
      <div 
        style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
        className="w-full h-full relative z-10"
      >
        {children}
      </div>
      
      <div className="absolute inset-0 bg-background/50 -z-10 rounded-[inherit]" />
    </motion.div>
  );
};

export const FeatureScrollReveal = () => {
  return (
    <div className="w-full flex flex-col gap-16 md:gap-24 py-8 overflow-hidden relative">
      {features.map((feature, idx) => {
        const isEven = idx % 2 === 0;
        const Icon = feature.icon;

        return (
          <div key={feature.id} className="container mx-auto px-6 max-w-5xl">
            <div className={cn(
              "flex flex-col md:flex-row items-center gap-8 lg:gap-12",
              isEven ? "md:flex-row" : "md:flex-row-reverse"
            )}>
              
              {/* Image Side (Slide in from edge) - Reduced width */}
              <motion.div 
                initial={{ opacity: 0, x: isEven ? -60 : 60, scale: 0.95 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full md:w-[42%]"
                style={{ perspective: "1000px" }}
              >
                <TiltCard className="relative w-full aspect-[16/10] rounded-2xl border border-border bg-card shadow-lg flex items-center justify-center overflow-hidden group hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] transition-shadow duration-500">
                  <div className="absolute inset-0 rounded-2xl overflow-hidden -z-10">
                    {feature.image ? (
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center">
                        <Icon className="w-24 h-24 text-primary opacity-10 group-hover:opacity-25 transition-opacity duration-700 group-hover:scale-110" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>
                  
                  {/* Floating abstract tech element on top of cards for depth - Made smaller */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-4 left-4 right-4 p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 hidden group-hover:flex items-center gap-2 transform translate-z-[15px]"
                  >
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                     <code className="text-white/80 text-[10px] font-mono whitespace-nowrap overflow-hidden text-ellipsis">System.{feature.id}.init()</code>
                  </motion.div>
                </TiltCard>
              </motion.div>

              {/* Text Side - Reduced font sizes and spacing */}
              <motion.div
                initial={{ opacity: 0, x: isEven ? 60 : -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                className="w-full md:w-[58%] flex flex-col items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                </div>
                
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                  {feature.title}
                </h3>
                
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                  {feature.description}
                </p>
                
              </motion.div>

            </div>
          </div>
        );
      })}
    </div>
  );
};
