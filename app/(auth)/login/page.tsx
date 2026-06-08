"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Package, Loader2, Monitor, CreditCard, Bell, Mail, Lock, Sparkles, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Welcome back!");
        router.push("/");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans antialiased selection:bg-indigo-500/30 overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative border-r border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.03),transparent_50%)] pointer-events-none" />
        
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="relative flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 shadow-lg shadow-primary/20">
            <Package className="h-5.5 w-5.5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black text-white tracking-tight leading-none block">InvenTrack</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 block">Inventory Systems</span>
          </div>
        </motion.div>

        {/* Feature Overview */}
        <div className="relative space-y-8 my-auto">
          <div className="space-y-4 max-w-lg">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" /> Next-Gen IT Management
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-extrabold text-white leading-tight tracking-tight"
            >
              IT inventory management, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">completely simplified.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-muted-foreground text-base leading-relaxed"
            >
              Track hardware specifications, manage recurring software licenses, map workspace desks, and receive renewal alerts — in one intuitive system.
            </motion.p>
          </div>

          {/* Mini Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 100 }}
            className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md space-y-4 shadow-2xl max-w-md"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Live Inventory Statistics</p>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-3">
              <div>
                <p className="text-2xl font-bold text-white">54</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Total Assets</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">74%</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">In Use Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">2</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Active Alerts</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative text-xs text-muted-foreground/60"
        >
          © InvenTrack · Enterprise IT Management Portal
        </motion.p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-8 relative">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="w-full max-w-[400px] bg-slate-900/50 border border-white/5 p-8 rounded-2xl backdrop-blur-xl shadow-2xl"
        >
          {/* Logo (Mobile Only) */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 shadow-md">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black text-white leading-none block">InvenTrack</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 block">Inventory</span>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5 mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Please sign in to access your administrative dashboard.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground/70" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@company.com" 
                  className="pl-10 h-10.5 bg-slate-950/60 border-white/10 text-white placeholder:text-muted-foreground/50 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                  {...register("email")} 
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 font-medium mt-1">{errors.email.message}</p>}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground/70" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-10.5 bg-slate-950/60 border-white/10 text-white placeholder:text-muted-foreground/50 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                  {...register("password")} 
                />
              </div>
              {errors.password && <p className="text-xs text-red-500 font-medium mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full h-11 mt-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl transition-all duration-200" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LayoutDashboard className="h-4 w-4 mr-2" />
              )}
              Sign In to Dashboard
            </Button>
          </form>

          {/* Demo account helper */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">Demo Credentials</p>
            <div className="inline-flex flex-col gap-1 px-4 py-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-[12px] font-medium font-mono text-left w-full">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-white">admin@company.com</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1">
                <span className="text-muted-foreground">Password:</span>
                <span className="text-white">admin123</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
