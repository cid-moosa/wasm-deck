import { domMax, LazyMotion, MotionConfig } from "framer-motion";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import { Route, Switch } from "wouter";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domMax} strict>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </LazyMotion>
      </MotionConfig>
    </ThemeProvider>
  );
}
