"use client"
import React, { useState, useMemo } from "react"
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  Target,
  Zap,
} from "lucide-react"

const ATTACKS = [
  {
    id: "fgsm",
    title: "Fast Gradient Sign Method (FGSM)",
    badge: { category: "White-Box", priority: "CRITICAL"},
    shortHistory:
      "Proposed by Goodfellow et al. in 2015. One of the first and most foundational adversarial attacks demonstrating vulnerability of modern neural networks.",
    mathematics:
      "x_adv = x + ε * sign( ∇_x J(x, y) )\n\nWhere ε controls the L_infty perturbation magnitude and ∇_x J is the loss gradient wrt input.",
    whereUsed:
      "Quick robustness benchmark and the basis for adversarial training (training with adversarial examples). Useful for lightweight checks during CI and model development.",
    userPerspective: {
      whatItDoes: "FGSM creates adversarial examples by making small, calculated changes to images in a single step. It adds tiny perturbations that are barely visible to humans but can fool AI models into making wrong predictions.",
      howItWorks: "The attack calculates which direction to modify each pixel to maximize the model's confusion, then shifts all pixels slightly in that direction. Think of it as finding the steepest path to trick the model.",
      realWorldImpact: "This attack is fast and simple, making it a common starting point for testing AI security. While not the strongest attack, it reveals fundamental vulnerabilities that affect most neural networks.",
      defenseConsiderations: "Models can be made more resistant through adversarial training - teaching them to recognize these perturbed examples during the learning process."
    }
  },
  {
    id: "pgd",
    title: "Projected Gradient Descent (PGD)",
    badge: { category: "White-Box", priority: "CRITICAL"},
    shortHistory:
      "Attributed to Madry et al. (2017). An iterative refinement of FGSM and the standard first-order benchmark for adversarial robustness.",
    mathematics:
      "x_adv^{t+1} = Clip_{x, ε}( x_adv^{t} + α * sign( ∇_x J(x_adv^{t}, y) ) )\n\nWhere α is the step size and Clip enforces the ε-ball constraint (usually L_infty).",
    whereUsed:
      "Gold-standard evaluation for defenses. Used in adversarial training when strong robustness guarantees are needed.",
    userPerspective: {
      whatItDoes: "PGD is a more powerful version of FGSM that takes multiple small steps instead of one big step. It repeatedly adjusts the image to find the most effective way to fool the model while staying within allowed perturbation limits.",
      howItWorks: "Instead of making one change, PGD makes many small modifications in sequence, checking after each step if it can fool the model better. It's like taking multiple attempts to find the best attack rather than one shot.",
      realWorldImpact: "PGD is considered the gold standard for testing AI robustness. If a model can defend against PGD attacks, it's likely robust against many other attacks too. This makes it crucial for security evaluations.",
      defenseConsiderations: "Training models with PGD-generated examples significantly improves robustness. However, this comes at a cost of increased training time and computational resources."
    }
  },
  {
    id: "cw",
    title: "Carlini & Wagner (C&W) Attack",
    badge: { category: "White-Box", priority: "HIGH"},
    shortHistory:
      "Introduced by Carlini and Wagner (2017) to defeat early defenses (e.g. defensive distillation). Formulated as an optimization problem.",
    mathematics:
      "minimize ||x_adv − x||_p^2 + c · f(x_adv)\n\nf(x_adv) is crafted to force misclassification; c is tuned (often via binary search) to trade off attack success vs perturbation size.",
    whereUsed:
      "Used for generating visually imperceptible adversarial examples and as a high-confidence, strong white-box test.",
    userPerspective: {
      whatItDoes: "C&W creates highly sophisticated adversarial examples that are extremely difficult to detect. It finds the absolute minimum changes needed to fool a model, making the modifications nearly invisible.",
      howItWorks: "Rather than using simple gradient steps, C&W solves an optimization problem that balances two goals: making the attack successful and keeping changes minimal. It's like finding the most efficient path to deceive the model.",
      realWorldImpact: "This attack broke many early AI defense mechanisms and showed that making adversarial examples detectable is much harder than expected. It produces some of the most imperceptible adversarial examples possible.",
      defenseConsiderations: "C&W attacks are computationally expensive but highly effective. Defending against them requires robust model architectures and training procedures, as simple detection methods often fail."
    }
  },
  {
    id: "deepfool",
    title: "DeepFool",
    badge: { category: "White-Box", priority: "HIGH"},
    shortHistory:
      "Proposed by Moosavi-Dezfooli et al. (2016). Designed to find the minimal norm perturbation required to cross the decision boundary.",
    mathematics:
      "At every iteration approximate the decision boundary as a linear hyperplane and compute the minimal perturbation to that hyperplane; accumulate until misclassification.",
    whereUsed:
      "Useful for measuring a model's robustness margin. The total perturbation norm is a comparative metric across models.",
    userPerspective: {
      whatItDoes: "DeepFool finds the absolute smallest change needed to make a model misclassify an input. It's like finding the shortest path to cross a decision boundary.",
      howItWorks: "The attack iteratively approximates the model's decision boundary and calculates the minimal step needed to cross it. It keeps taking small steps until the model changes its prediction.",
      realWorldImpact: "DeepFool is particularly useful for measuring how 'far' an input is from being misclassified. This distance metric helps compare the robustness of different AI models objectively.",
      defenseConsiderations: "The distance measured by DeepFool indicates a model's safety margin. Larger distances mean the model is more robust and requires bigger perturbations to be fooled."
    }
  },
  {
    id: "gaussian",
    title: "Gaussian Noise (Perturbation)",
    badge: { category: "Perturbation", priority: "HIGH"},
    shortHistory:
      "A non-adversarial baseline: add random Gaussian noise to inputs to test model generalization and resilience to natural corruptions.",
    mathematics:
      "η ∼ N(μ, σ^2); x_adv = x + η\n\nControlled by μ and σ which govern intensity and spread.",
    whereUsed:
      "Test model robustness to sensor noise, transmission errors, and real-world corruptions. Not designed to be strategic like FGSM/PGD.",
    userPerspective: {
      whatItDoes: "This adds random noise to images, similar to what you might see from a low-quality camera or poor lighting conditions. Unlike other attacks, it's not designed to strategically fool the model.",
      howItWorks: "Random values from a bell curve distribution are added to each pixel. The amount of noise is controlled by parameters that determine the average intensity and spread of the random values.",
      realWorldImpact: "Gaussian noise simulates real-world conditions like sensor errors, compression artifacts, or transmission interference. Testing against it ensures models work reliably in practical scenarios, not just on perfect data.",
      defenseConsiderations: "Models trained with noisy data tend to be more robust in deployment. This is a simple but effective way to improve generalization and reliability in real-world applications."
    }
  },
]

export default function DocsPage() {
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return ATTACKS
    const q = query.toLowerCase()
    return ATTACKS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.shortHistory.toLowerCase().includes(q) ||
        a.mathematics.toLowerCase().includes(q) ||
        a.whereUsed.toLowerCase().includes(q) ||
        a.userPerspective.whatItDoes.toLowerCase().includes(q) ||
        a.userPerspective.howItWorks.toLowerCase().includes(q)
    )
  }, [query])

  function toggle(id) {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Documentation</h1>
              <p className="text-muted-foreground text-sm">Clear, practical explanations of implemented attacks</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-card border border-border rounded-lg px-3 py-2 gap-2 w-full sm:w-80 lg:w-96">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                aria-label="Search documentation"
                placeholder="Search attacks, concepts"
                className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-64 shrink-0 rounded-xl bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground font-semibold mb-3">Table of contents</p>
            <ul className="space-y-2">
              {ATTACKS.map((a) => (
                <li key={a.id}>
                  <button
                    className="text-sm text-foreground hover:text-primary transition-colors text-left w-full"
                    onClick={() => {
                      toggle(a.id)
                      const el = document.getElementById(`attack-${a.id}`)
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
                    }}
                  >
                    {a.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            {filtered.length === 0 && (
              <div className="rounded-xl bg-card border border-border p-6 text-center text-muted-foreground">
                No results. Try different keywords.
              </div>
            )}

            {filtered.map((a) => {
              const expanded = openId === a.id
              return (
                <article
                  id={`attack-${a.id}`}
                  key={a.id}
                  className="rounded-xl bg-card border border-border p-6"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground mb-1">{a.title}</h2>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-1 rounded bg-primary/10 text-primary font-semibold">{a.badge.category}</span>
                        <span className="px-2 py-1 rounded bg-destructive/5 text-destructive">{a.badge.priority}</span>
                        <span className="px-2 py-1 rounded bg-secondary/5 text-secondary">{a.badge.complexity}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        aria-expanded={expanded}
                        onClick={() => toggle(a.id)}
                        className="p-2 rounded-lg bg-secondary/10 hover:bg-secondary transition-colors"
                        title={expanded ? "Collapse" : "Expand"}
                      >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </header>

                  {expanded && (
                    <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                      <section>
                        <h3 className="font-semibold text-foreground mb-1">Short History</h3>
                        <p>{a.shortHistory}</p>
                      </section>

                      <section className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold text-foreground">What It Does</h3>
                        </div>
                        <p>{a.userPerspective.whatItDoes}</p>
                      </section>

                      <section className="bg-secondary/5 p-4 rounded-lg border border-secondary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-secondary" />
                          <h3 className="font-semibold text-foreground">How It Works</h3>
                        </div>
                        <p>{a.userPerspective.howItWorks}</p>
                      </section>

                      <section className="bg-accent/5 p-4 rounded-lg border border-accent/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-accent" />
                          <h3 className="font-semibold text-foreground">Real-World Impact</h3>
                        </div>
                        <p>{a.userPerspective.realWorldImpact}</p>
                      </section>

                      <section>
                        <h3 className="font-semibold text-foreground mb-1">Defense Considerations</h3>
                        <p>{a.userPerspective.defenseConsiderations}</p>
                      </section>

                      <section>
                        <h3 className="font-semibold text-foreground mb-1">Mathematics</h3>
                        <pre className="bg-background/30 p-3 rounded text-xs overflow-auto border border-border text-foreground">
                          <code>{a.mathematics}</code>
                        </pre>
                      </section>

                      <section>
                        <h3 className="font-semibold text-foreground mb-1">Where it's used</h3>
                        <p>{a.whereUsed}</p>
                      </section>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}