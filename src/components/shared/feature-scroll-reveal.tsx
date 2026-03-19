import React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { Calendar, ListTodo, Github, Code2, Bug, Layers, Activity, FileText, ShieldAlert, Sparkles } from "lucide-react";

// Exact 9 Core Developer Execution System tools as requested
const features = [
  { id: "project-planner", title: "AI Project Planner", description: "Turn ideas into structured development plans instantly.", image: "/images/project_planner_simple_1773916080450.png", icon: Calendar },
  { id: "architecture-advisor", title: "Architecture Advisor", description: "AI designs scalable architecture for your project.", image: "/images/architecture_advisor.png", icon: Layers }, 
  { id: "debug-assistant", title: "AI Debugging Assistant", description: "Fix bugs faster with AI-powered debugging.", image: "/images/debug_assistant_simple_1773916154254.png", icon: Bug },
  { id: "code-explainer", title: "Code Explainer", description: "Understand complex code instantly.", image: "/images/ai_reviewer_simple_1773916138979.png", icon: FileText },
  { id: "performance-analyzer", title: "Performance Analyzer", description: "Optimize performance automatically.", image: "/images/performance_analyzer.png", icon: Activity }, 
  { id: "feature-tracker", title: "Feature Tracker", description: "Track your entire development lifecycle.", image: "/images/feature_planner_simple_1773916096734.png", icon: ListTodo },
  { id: "github-integration", title: "GitHub Integration", description: "Connect your GitHub repo and let AI understand your project.", image: "/images/github_inter_simple_1773916110111.png", icon: Github },
  { id: "edge-case-detector", title: "Edge Case Detector", description: "Detect hidden bugs before production.", image: "", icon: ShieldAlert },
  { id: "ai-code-refactoring", title: "AI Code Refactoring", description: "Refactor code intelligently.", image: "", icon: Code2 }
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
    <div className="w-full flex flex-col gap-32 py-16 overflow-hidden relative">
      {features.map((feature, idx) => {
        const isEven = idx % 2 === 0;
        const Icon = feature.icon;

        return (
          <div key={feature.id} className="container mx-auto px-6 max-w-6xl">
            <div className={cn(
              "flex flex-col md:flex-row items-center gap-12 lg:gap-20",
              isEven ? "md:flex-row" : "md:flex-row-reverse"
            )}>
              
              {/* Image Side (Slide in from edge) */}
              <motion.div 
                initial={{ opacity: 0, x: isEven ? -80 : 80 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full md:w-1/2"
                style={{ perspective: "1000px" }}
              >
                <TiltCard className="relative w-full aspect-[4/3] rounded-3xl border border-border bg-card shadow-xl flex items-center justify-center overflow-hidden group hover:shadow-[0_0_40px_rgba(124,58,237,0.2)] transition-shadow duration-500">
                  <div className="absolute inset-0 rounded-3xl overflow-hidden -z-10">
                    {feature.image ? (
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.1]"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/10 via-background to-background flex items-center justify-center">
                        <Icon className="w-40 h-40 text-primary opacity-20 group-hover:opacity-40 transition-opacity duration-700 group-hover:scale-110" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  </div>
                  
                  {/* Floating abstract tech element on top of cards for depth */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hidden group-hover:flex items-center gap-3 transform translate-z-[20px]"
                  >
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <code className="text-white/80 text-sm font-mono">System.{feature.id}.initialize()</code>
                  </motion.div>
                </TiltCard>
              </motion.div>

              {/* Text Side */}
              <motion.div
                initial={{ opacity: 0, x: isEven ? 80 : -80 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="w-full md:w-1/2 flex flex-col items-start gap-6"
              >
                <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm flex items-center gap-3">
                  <Icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                  {feature.title}
                </h3>
                
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
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
