import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import ChatInterface from "../components/ChatInterface";
import supabase from "../lib/supabase";
import customAxios from "../lib/api";

function AnalysisPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState(null);

  const handleNewChatCreated = (newChatId) => {
    setChatId(newChatId);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Supabase session first
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          localStorage.setItem("supabase_token", session.access_token);
          localStorage.setItem("isLoggedIn", "true");
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }

        // Fallback to localStorage check
        const token = localStorage.getItem("supabase_token");
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

        if (!token || !isLoggedIn) {
          router.push("/login");
          return;
        }

        // Verify token with backend
        try {
          await customAxios.get("/auth/profile");
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Token verification failed:", error);
          localStorage.removeItem("supabase_token");
          localStorage.removeItem("isLoggedIn");
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A140D] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D9B799]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Data Analysis - Analytics Depot</title>
        <meta name="description" content="Chat with your documents and data." />
      </Head>
      <div className="flex flex-col h-screen bg-[#1A140D] text-[#F0E6DA]">
        <header className="p-4 border-b border-[#3D2F24] flex-shrink-0 bg-[#2D1F14]">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-xl font-bold text-[#F0E6DA]">
              Chat with Your Document
            </h1>
            <nav className="flex items-center space-x-4">
              <Link
                href="/chat"
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
              >
                Chat
              </Link>
              <Link
                href="/dashboard"
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-[#F0E6DA] font-semibold">Analysis</span>
              <Link
                href="/reports"
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
              >
                Reports
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  localStorage.removeItem("supabase_token");
                  localStorage.removeItem("isLoggedIn");
                  localStorage.removeItem("userData");
                  router.push("/");
                }}
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
              >
                Logout
              </button>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col bg-[#1A140D] overflow-hidden">
          <ChatInterface
            chatId={chatId}
            setChatId={setChatId}
            onNewChatCreated={handleNewChatCreated}
            isNewChat={chatId === null}
            specialistProfile="real_estate"
            introMessage="Welcome! Upload a document and I'll help you analyze it."
            currentChat={[]}
            setCurrentChat={() => {}}
            onSendMessage={() => {}}
            loading={false}
            error={null}
            suggestedQueries={[
              "Analyze this document for key insights",
              "What are the main themes in this document?",
              "Create a summary of this document",
            ]}
            setActiveData={() => {}}
            fileData={null}
          />
        </main>
      </div>
    </>
  );
}

export default AnalysisPage;
