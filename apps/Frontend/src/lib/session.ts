export interface SessionUser {
  userId?: string;
  username?: string;
  email?: string;
  role?: string;
  depositeMemo?: string;
}

export const persistSessionUser = (user: SessionUser) => {
  if (user.userId) localStorage.setItem("userId", user.userId);
  if (user.username) localStorage.setItem("username", user.username);
  if (user.email) localStorage.setItem("email", user.email);
  if (user.role) localStorage.setItem("userRole", user.role);
  if (user.depositeMemo) localStorage.setItem("depositeMemo", user.depositeMemo);
};

export const getStoredSessionUser = (): Required<SessionUser> => ({
  userId: localStorage.getItem("userId") || "",
  username: localStorage.getItem("username") || "",
  email: localStorage.getItem("email") || "",
  role: localStorage.getItem("userRole") || "USER",
  depositeMemo: localStorage.getItem("depositeMemo") || "",
});

export const clearSessionUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userRole");
  localStorage.removeItem("username");
  localStorage.removeItem("email");
  localStorage.removeItem("userId");
  localStorage.removeItem("depositeMemo");
};
