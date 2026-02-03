"use client"

import { useState, useTransition } from "react"
import { ShoppingCart, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface AddToCartButtonProps {
  courseId: string
  initialInCart?: boolean
  variant?: "icon" | "full"
  className?: string
}

export function AddToCartButton({
  courseId,
  initialInCart = false,
  variant = "full",
  className,
}: AddToCartButtonProps) {
  const [inCart, setInCart] = useState(initialInCart)
  const [isPending, startTransition] = useTransition()
  const { data: session } = useSession()
  const router = useRouter()

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!session?.user) {
      router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname))
      return
    }

    if (inCart) {
      router.push("/cart")
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        })

        const data = await res.json()

        if (!res.ok) {
          if (data.code === "ALREADY_IN_CART") {
            setInCart(true)
            router.push("/cart")
            return
          }
          throw new Error(data.error || "Failed to add to cart")
        }

        setInCart(true)
        toast.success("Added to cart")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to add to cart"
        )
      }
    })
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleAddToCart}
        disabled={isPending}
        className={cn(
          "rounded-full bg-white p-2 shadow-md transition-all hover:scale-110",
          isPending && "opacity-50",
          className
        )}
        aria-label={inCart ? "Go to cart" : "Add to cart"}
      >
        {inCart ? (
          <Check className="h-5 w-5 text-green-600" />
        ) : (
          <ShoppingCart className="h-5 w-5 text-slate-700" />
        )}
      </button>
    )
  }

  return (
    <Button
      variant={inCart ? "secondary" : "default"}
      size="lg"
      className={cn("w-full", className)}
      onClick={handleAddToCart}
      disabled={isPending}
    >
      {inCart ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Go to Cart
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </>
      )}
    </Button>
  )
}
