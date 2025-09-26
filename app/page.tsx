import React from "react";
import AITradingDashboard from "@/components/dashboard/AITradingDashboard";
import OrderExecutionDebugger from "@/components/OrderExecutionDebugger";


export default function Home() {
  return (
    <div>
      <main>
      <AITradingDashboard/>
      <OrderExecutionDebugger/>
      </main>
    </div>
  );
}
