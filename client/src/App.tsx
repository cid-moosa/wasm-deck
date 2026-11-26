import { domMax, LazyMotion, MotionConfig } from "framer-motion";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import { Route, Router, Switch } from "wouter";
import { ThemeProvider } from "./contexts/ThemeContext";

const routerBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

function AppRoutes() {
  return (
    <Router base={routerBase}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domMax} strict>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </LazyMotion>
      </MotionConfig>
    </ThemeProvider>
  );
}
