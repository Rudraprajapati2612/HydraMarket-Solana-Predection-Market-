import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

interface UserProfile {
  userId: string;
  username: string;
  email: string;
  fullName: string | null;
  depositeMemo: string;
  createdAt: string;
}

export const Profile = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Edit states per field
  const [editingField, setEditingField] = useState<'username' | 'fullName' | 'email' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const isDark = true;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(false);
    try {
      // Simulate API call GET /auth/me
      await new Promise(resolve => setTimeout(resolve, 1200));
      setProfile({
        userId: "usr_abc123",
        username: "JohnDoe",
        email: "john@example.com",
        fullName: "John Doe",
        depositeMemo: "DEP-ABC123",
        createdAt: "2026-01-15T10:00:00Z"
      });
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = async () => {
    if (!editingField || !profile) return;
    setSaveLoading(true);
    setSaveError('');
    try {
      // Simulate PATCH /auth/me
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProfile({ ...profile, [editingField]: editValue });
      toast.success(`${editingField.toUpperCase()}_UPDATED`, {
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333', fontFamily: 'monospace' }
      });
      setEditingField(null);
    } catch (err) {
      setSaveError('UPDATE_FAILED');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
        setPasswordError('ERR: MIN_8_CHARS');
        return;
    }
    if (newPassword !== confirmPassword) {
        setPasswordError('ERR: PASSWORDS_MISMATCH');
        return;
    }
    
    setPasswordLoading(true);
    setPasswordError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('PASSWORD_UPDATED', {
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333', fontFamily: 'monospace' }
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError('PASSWORD_UPDATE_FAILED');
    } finally {
      setPasswordLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} COPIED`, {
        duration: 2000,
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333', fontFamily: 'monospace', fontSize: '10px' }
    });
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="h-screen bg-bg-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin"></div>
          <div className="text-[10px] text-cyber-blue font-code animate-pulse tracking-widest uppercase">Initializing_Profile_Data...</div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="h-screen bg-bg-dark flex flex-col items-center justify-center font-mono text-pro-red">
        <div className="mb-4 uppercase tracking-widest">ERR: PROFILE_FETCH_FAILED //</div>
        <button 
          onClick={fetchProfile}
          className="border border-pro-red px-4 py-2 hover:bg-pro-red/10 transition-colors uppercase text-xs"
        >
          [RETRY]
        </button>
      </div>
    );
  }

  return (
    <div className="bg-bg-dark text-text-light font-mono antialiased overflow-hidden h-screen flex flex-col relative">
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isDark={isDark} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <main className="flex-1 flex flex-col min-w-0 bg-bg-dark relative overflow-hidden">
          <div className="absolute inset-0 grid-dark grid-bg pointer-events-none"></div>

          <header className="h-16 border-b border-border-dark bg-bg-dark/90 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 shrink-0">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden text-text-muted hover:text-cyber-blue transition-colors"
                onClick={() => setIsSidebarOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h1 className="text-sm md:text-lg font-code font-bold text-text-light tracking-tight uppercase flex items-center gap-1">
                USER_COMMAND // PROFILE
                <span className="w-2 h-5 bg-cyber-blue animate-pulse ml-1"></span>
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 space-y-6">
            {/* Profile Header Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card-dark border border-border-dark p-8 relative group overflow-hidden"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="w-24 h-24 bg-cyber-blue/10 border border-cyber-blue/30 flex items-center justify-center text-3xl font-bold text-cyber-blue font-code shrink-0">
                  {getInitials(profile.username)}
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold font-code text-text-light uppercase tracking-tight">USER_{profile.username}</h2>
                  <p className={`text-sm ${profile.fullName ? 'text-text-muted' : 'text-text-muted/40 italic'}`}>
                    {profile.fullName || "// NO_NAME_SET"}
                  </p>
                  <p className="text-xs text-text-muted/60 font-mono">{profile.email}</p>
                  <div className="pt-2 space-y-1">
                    <p className="text-[10px] text-text-muted/40 uppercase tracking-widest">Member since: {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <button 
                      onClick={() => copyToClipboard(profile.userId, 'USER_ID')}
                      className="text-[10px] text-text-muted/40 hover:text-cyber-blue transition-colors uppercase tracking-widest flex items-center gap-1"
                    >
                      USER_ID: {profile.userId} <span className="material-symbols-outlined text-[12px]">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-2 text-[10px] text-pro-green font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-pro-green animate-pulse"></span>
                ACCOUNT_STATUS: ACTIVE
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Account Details */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card-dark border border-border-dark p-6 space-y-8"
              >
                <h3 className="text-xs font-bold text-cyber-blue font-code uppercase tracking-widest">// ACCOUNT_DETAILS</h3>
                
                <div className="space-y-6">
                  <EditableField 
                    label="USERNAME" 
                    value={profile.username} 
                    isEditing={editingField === 'username'}
                    onEdit={() => { setEditingField('username'); setEditValue(profile.username); }}
                    onCancel={() => setEditingField(null)}
                    onSave={handleUpdateField}
                    onChange={(v) => setEditValue(v)}
                    editValue={editValue}
                    loading={saveLoading && editingField === 'username'}
                  />

                  <EditableField 
                    label="FULL_NAME" 
                    value={profile.fullName || "// NOT_SET"} 
                    isEditing={editingField === 'fullName'}
                    onEdit={() => { setEditingField('fullName'); setEditValue(profile.fullName || ''); }}
                    onCancel={() => setEditingField(null)}
                    onSave={handleUpdateField}
                    onChange={(v) => setEditValue(v)}
                    editValue={editValue}
                    loading={saveLoading && editingField === 'fullName'}
                    isPlaceholder={!profile.fullName}
                  />

                  <EditableField 
                    label="EMAIL" 
                    value={profile.email} 
                    isEditing={editingField === 'email'}
                    onEdit={() => { setEditingField('email'); setEditValue(profile.email); }}
                    onCancel={() => setEditingField(null)}
                    onSave={handleUpdateField}
                    onChange={(v) => setEditValue(v)}
                    editValue={editValue}
                    loading={saveLoading && editingField === 'email'}
                    type="email"
                  />

                  <div className="space-y-2">
                    <label className="text-[10px] text-text-muted/60 uppercase tracking-widest font-bold">MEMBER_SINCE</label>
                    <div className="text-sm text-text-light font-mono">
                      {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-[10px] text-text-muted/40 italic">// Read only — cannot be edited</div>
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Deposit Memo */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card-dark border border-border-dark p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold text-cyber-blue font-code uppercase tracking-widest">// DEPOSIT_MEMO</h3>
                  <div className="flex items-center gap-2 text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    IMPORTANT
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="text-[11px] text-text-muted leading-relaxed">
                    Your unique deposit identifier.<br />
                    You MUST include this when sending USDC.
                  </div>

                  <div className="p-4 bg-black/40 border border-border-dark flex items-center justify-between group">
                    <span className="text-lg font-bold font-code text-text-light tracking-widest">{profile.depositeMemo}</span>
                    <button 
                      onClick={() => copyToClipboard(profile.depositeMemo, 'MEMO')}
                      className="px-3 py-1 border border-border-dark text-[10px] text-text-muted hover:border-cyber-blue hover:text-cyber-blue transition-all uppercase font-bold"
                    >
                      [📋 COPY]
                    </button>
                  </div>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-amber-500 font-bold uppercase">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      WARNING
                    </div>
                    <p className="text-[10px] text-amber-500/80 leading-relaxed">
                      Deposits sent without this memo cannot be automatically credited to your account.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[10px] text-text-muted/60 font-bold uppercase tracking-widest">HOW TO USE:</div>
                    <ol className="space-y-2 text-[10px] text-text-muted/40 font-mono list-decimal pl-4">
                      <li>Copy the memo above</li>
                      <li>Open Phantom or any Solana wallet</li>
                      <li>Send USDC to the platform deposit address</li>
                      <li>Paste this memo in the memo/note field</li>
                      <li>Balance credits in ~30 seconds</li>
                    </ol>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/portfolio')}
                  className="w-full mt-8 py-3 border border-cyber-blue/30 text-cyber-blue text-[10px] font-bold uppercase tracking-widest hover:bg-cyber-blue/10 transition-all"
                >
                  [💰 GO TO DEPOSIT PAGE →]
                </button>
              </motion.div>
            </div>

            {/* Security Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card-dark border border-border-dark p-6 space-y-12"
            >
              <h3 className="text-xs font-bold text-cyber-blue font-code uppercase tracking-widest">// SECURITY_SETTINGS</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Change Password */}
                <div className="space-y-6">
                  <h4 className="text-[10px] text-text-muted font-bold uppercase tracking-widest">CHANGE_PASSWORD</h4>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <PasswordField 
                      label="Current Password" 
                      value={currentPassword} 
                      onChange={setCurrentPassword}
                      show={showPasswords.current}
                      onToggle={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                    />
                    <PasswordField 
                      label="New Password" 
                      value={newPassword} 
                      onChange={setNewPassword}
                      show={showPasswords.new}
                      onToggle={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                      error={newPassword.length > 0 && newPassword.length < 8 ? "ERR: MIN_8_CHARS" : ""}
                    />
                    <PasswordField 
                      label="Confirm Password" 
                      value={confirmPassword} 
                      onChange={setConfirmPassword}
                      show={showPasswords.confirm}
                      onToggle={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                      error={confirmPassword.length > 0 && confirmPassword !== newPassword ? "ERR: PASSWORDS_MISMATCH" : ""}
                    />

                    {passwordError && <div className="text-[10px] text-pro-red font-bold">{passwordError}</div>}

                    <div className="flex justify-end pt-4">
                      <button 
                        type="submit"
                        disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                        className="px-6 py-2 bg-cyber-blue text-bg-dark text-[10px] font-bold uppercase tracking-widest hover:bg-cyber-blue/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        {passwordLoading ? "UPDATING..." : "[UPDATE_PASSWORD →]"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Session Info */}
                <div className="space-y-6">
                  <h4 className="text-[10px] text-text-muted font-bold uppercase tracking-widest">// ACTIVE_SESSION</h4>
                  <div className="space-y-4 text-[11px] font-mono">
                    <div className="flex justify-between border-b border-border-dark/30 pb-2">
                      <span className="text-text-muted/60">SESSION_ID:</span>
                      <span className="text-text-light">0x02...F92A</span>
                    </div>
                    <div className="flex justify-between border-b border-border-dark/30 pb-2">
                      <span className="text-text-muted/60">STARTED:</span>
                      <span className="text-text-light">Today at 2:42 PM</span>
                    </div>
                    <div className="flex justify-between border-b border-border-dark/30 pb-2">
                      <span className="text-text-muted/60">NODE:</span>
                      <span className="text-text-light">HYDRA_AWS_WEST_02</span>
                    </div>
                    <div className="flex justify-between border-b border-border-dark/30 pb-2">
                      <span className="text-text-muted/60">STATUS:</span>
                      <span className="text-pro-green font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-pro-green animate-pulse"></span>
                        ACTIVE
                      </span>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={() => {
                        localStorage.removeItem('userRole');
                        navigate('/login');
                      }}
                      className="px-4 py-2 border border-pro-red/30 text-pro-red text-[10px] font-bold uppercase tracking-widest hover:bg-pro-red/10 transition-all"
                    >
                      [TERMINATE_SESSION]
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

const EditableField = ({ label, value, isEditing, onEdit, onCancel, onSave, onChange, editValue, loading, type = "text", isPlaceholder = false }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] text-text-muted/60 uppercase tracking-widest font-bold">{label}</label>
    <div className="flex items-center justify-between gap-4">
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input 
            type={type}
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            className="flex-1 bg-black/40 border border-cyber-blue/30 px-3 py-1.5 text-sm text-text-light focus:outline-none focus:border-cyber-blue transition-all font-mono"
          />
          <button 
            onClick={onSave}
            disabled={loading}
            className="px-3 py-1.5 bg-cyber-blue text-bg-dark text-[10px] font-bold uppercase tracking-widest hover:bg-cyber-blue/80 disabled:opacity-50"
          >
            {loading ? "..." : "[SAVE]"}
          </button>
          <button 
            onClick={onCancel}
            className="px-3 py-1.5 border border-border-dark text-text-muted text-[10px] font-bold uppercase tracking-widest hover:text-text-light"
          >
            [CANCEL]
          </button>
        </div>
      ) : (
        <>
          <span className={`text-sm font-mono ${isPlaceholder ? 'text-text-muted/40 italic' : 'text-text-light'}`}>
            {value}
          </span>
          <button 
            onClick={onEdit}
            className="px-3 py-1 border border-border-dark text-text-muted text-[10px] font-bold uppercase tracking-widest hover:border-cyber-blue hover:text-cyber-blue transition-all"
          >
            {isPlaceholder ? "[ADD]" : "[EDIT]"}
          </button>
        </>
      )}
    </div>
  </div>
);

const PasswordField = ({ label, value, onChange, show, onToggle, error }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] text-text-muted/60 uppercase tracking-widest font-bold">{label}:</label>
    <div className="relative">
      <input 
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-black/40 border ${error ? 'border-pro-red' : 'border-border-dark'} px-3 py-2 text-sm text-text-light focus:outline-none focus:border-cyber-blue transition-all font-mono pr-10`}
      />
      <button 
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted/40 hover:text-cyber-blue transition-colors"
      >
        <span className="material-symbols-outlined text-lg">{show ? "visibility_off" : "visibility"}</span>
      </button>
    </div>
    {error && <div className="text-[9px] text-pro-red font-bold uppercase">{error}</div>}
  </div>
);
