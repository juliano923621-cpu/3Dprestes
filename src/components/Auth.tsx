import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, Loader2, Package, AlertCircle } from 'lucide-react';

interface AuthProps {
  onSession: () => void;
}

export function Auth({ onSession }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('3dprestes@gestao.com');
  const [password, setPassword] = useState('92369236');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(
    !isSupabaseConfigured ? { type: 'error', text: 'Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no menu Settings.' } : null
  );

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: 'Supabase não configurado. Por favor, adicione as chaves de API nas configurações do projeto.' });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Conta criada! Verifique seu e-mail ou tente fazer login.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSession();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message === 'Invalid login credentials' ? 'Usuário ou senha incorretos. Verifique se você já criou a conta.' : error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_50%)]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-10 space-y-8 relative z-10"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white mb-2 shadow-lg shadow-blue-600/20">
            <Package size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">3D Prestes</h1>
          <p className="text-slate-400 text-sm">
            {isSignUp ? 'Crie sua conta de administrador' : 'Entre no painel de gestão'}
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4">
            <div className="flex gap-3 text-amber-200">
              <AlertCircle className="shrink-0" size={20} />
              <div>
                <h3 className="font-bold text-sm mb-1">Configuração Necessária</h3>
                <p className="text-xs leading-relaxed opacity-90">
                  Para o sistema funcionar, você deve adicionar as chaves do seu projeto Supabase nas configurações do AI Studio.
                </p>
              </div>
            </div>
            
            <div className="space-y-2 text-[11px] text-slate-400 font-mono bg-slate-900/50 p-3 rounded-lg border border-slate-700">
              <p>1. Vá em <strong className="text-white">Settings</strong> no menu superior</p>
              <p>2. Adicione <strong className="text-blue-400">VITE_SUPABASE_URL</strong></p>
              <p>3. Adicione <strong className="text-blue-400">VITE_SUPABASE_ANON_KEY</strong></p>
            </div>

            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">Aguardando configuração...</p>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Usuário / E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: 3dprestes@gestao.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="92369236"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-xl text-xs font-semibold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
              >
                {message.text}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
                  <span className="tracking-wide">{isSignUp ? 'CADASTRAR AGORA' : 'ENTRAR NO SISTEMA'}</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-medium text-slate-500 hover:text-blue-400 transition-colors"
          >
            {isSignUp ? 'Já tem a conta 3dprestes? Entre aqui' : 'Primeiro acesso? Clique para criar sua conta'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
