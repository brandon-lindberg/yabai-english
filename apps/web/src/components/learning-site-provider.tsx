"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { LearningSite, LearningSites } from "@/lib/learning-sites";
const Context = createContext<{ site: LearningSite | null; sites: LearningSites | null }>({ site: null, sites: null });
export function LearningSiteProvider({ site, sites, children }: {
  site: LearningSite | null; sites: LearningSites | null; children: ReactNode;
}) { return <Context.Provider value={{ site, sites }}>{children}</Context.Provider>; }
export function useLearningSite() { return useContext(Context); }
