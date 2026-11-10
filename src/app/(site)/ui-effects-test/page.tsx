"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import { CakeCard } from "@/components/cake-card";
import type { Cake } from "@/lib/types";

// Mock data for testing
const mockCakes: Cake[] = [
  {
    id: "1",
    name: "Classic Chocolate Cake",
    slug: "classic-chocolate-cake",
    description: "Rich, moist chocolate cake with perfect crumb texture",
    flavor: "Chocolate",
    occasions: ["birthday", "gift"],
    base_price: 2500,
    stock: 5,
    is_active: true,
    is_featured: true,
    is_custom_available: true,
    created_at: "2026-01-01T00:00:00Z",
    category: "Chocolate",
    image_urls: ["/cakes/classic-chocolate.jpg"],
    sizes: [
      { id: "s1", cake_id: "1", weight: 1, price: 2500, is_available: true },
      { id: "s2", cake_id: "1", weight: 2, price: 4500, is_available: true },
      { id: "s3", cake_id: "1", weight: 3, price: 6500, is_available: false },
    ],
  },
  {
    id: "2", 
    name: "Vanilla Dream Cake",
    slug: "vanilla-dream-cake",
    description: "Light and fluffy vanilla cake with delicate frosting",
    flavor: "Vanilla",
    occasions: ["anniversary", "occasion"],
    base_price: 2200,
    stock: 8,
    is_active: true,
    is_featured: false,
    is_custom_available: false,
    created_at: "2026-01-02T00:00:00Z",
    category: "Vanilla",
    image_urls: ["/cakes/vanilla-dream.jpg"],
    sizes: [
      { id: "s4", cake_id: "2", weight: 1, price: 2200, is_available: true },
      { id: "s5", cake_id: "2", weight: 2, price: 4000, is_available: true },
      { id: "s6", cake_id: "2", weight: 3, price: 5800, is_available: true },
    ],
  },
  {
    id: "3",
    name: "Strawberry Delight Cake",
    slug: "strawberry-delight-cake", 
    description: "Fresh strawberry cake with cream cheese frosting",
    flavor: "Strawberry",
    occasions: ["gift", "others"],
    base_price: 2800,
    stock: 0,
    is_active: true,
    is_featured: true,
    is_custom_available: true,
    created_at: "2026-01-03T00:00:00Z",
    category: "Fruit",
    image_urls: ["/cakes/strawberry-delight.jpg"],
    sizes: [
      { id: "s7", cake_id: "3", weight: 1, price: 2800, is_available: true },
      { id: "s8", cake_id: "3", weight: 2, price: 5200, is_available: false },
    ],
  },
];

export default function UIEffectsTestPage() {
  const [testMode, setTestMode] = useState('cards');
  const [isLoading, setIsLoading] = useState(false);

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">UI Effects Test Suite</h1>
        <p className="text-muted max-w-2xl mx-auto">
          Testing cake cards with lightbox carousel and skeleton loading
        </p>
      </div>

      {/* Test Mode Selector */}
      <div className="flex justify-center gap-4 flex-wrap">
        {[
          { id: 'cards', label: 'Cake Cards' },
          { id: 'skeletons', label: 'Skeleton Loading' },
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => setTestMode(mode.id)}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${testMode === mode.id
              ? 'bg-brand text-brand-fg shadow-lift'
              : 'bg-surface text-muted hover:bg-brand/10 border border-line'
            }
            `}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Test Content */}
      {testMode === 'cards' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-semibold">Cake Cards (with Lightbox)</h2>
          <p className="text-muted">Click on a card with multiple images to open the lightbox carousel.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockCakes.map((cake) => (
              <CakeCard
                key={cake.id}
                cake={cake}
                rating={4.5}
                reviewCount={12}
                priority={true}
              />
            ))}
          </div>
        </motion.div>
      )}

      {testMode === 'skeletons' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-semibold">Skeleton Loading Effects</h2>
          <p className="text-muted">Test the smooth skeleton loading with shimmer animations.</p>
          
          <div className="flex gap-4 mb-6">
            <button onClick={simulateLoading} className="btn btn-primary">
              Simulate Loading
            </button>
            <div className="text-sm text-muted flex items-center">
              Loading state: {isLoading ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoading ? (
              // Show skeletons when loading
              <>
                <div className="space-y-3">
                  <SkeletonLoader className="h-32 w-full" variant="rectangular" />
                  <SkeletonLoader className="h-4 w-3/4" variant="text" />
                  <SkeletonLoader className="h-4 w-1/2" variant="text" />
                </div>
                <div className="space-y-3">
                  <SkeletonLoader className="h-32 w-full rounded-full" variant="circular" />
                  <SkeletonLoader className="h-4 w-3/4" variant="text" />
                  <SkeletonLoader className="h-4 w-2/3" variant="text" />
                </div>
                <div className="space-y-3">
                  <SkeletonLoader className="h-32 w-full" variant="rectangular" />
                  <SkeletonLoader className="h-4 w-full" variant="text" />
                  <SkeletonLoader className="h-4 w-5/6" variant="text" />
                </div>
              </>
            ) : (
              // Show content when loaded
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="card p-6"
                >
                  <div className="h-32 bg-gradient-to-r from-surface to-surface/50 rounded-lg mb-4" />
                  <div className="h-4 bg-surface rounded w-3/4 mb-2" />
                  <div className="h-4 bg-surface rounded w-1/2" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="card p-6"
                >
                  <div className="h-32 bg-gradient-to-r from-surface to-surface/50 rounded-full mb-4 mx-auto w-32" />
                  <div className="h-4 bg-surface rounded w-3/4 mb-2" />
                  <div className="h-4 bg-surface rounded w-2/3" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="card p-6"
                >
                  <div className="h-32 bg-gradient-to-r from-surface to-surface/50 rounded-lg mb-4" />
                  <div className="h-4 bg-surface rounded w-full mb-2" />
                  <div className="h-4 bg-surface rounded w-5/6" />
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Effects Summary */}
      <div className="mt-12 card p-8 bg-gradient-to-br from-brand/5 to-surface">
        <h2 className="text-2xl font-semibold mb-4">Implemented Effects Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Lightbox Carousel', desc: 'Full-screen image carousel with thumbnails' },
            { name: 'Square Images', desc: '1:1 aspect ratio for cake cards' },
            { name: 'Smooth Loading', desc: 'Shimmer skeleton animations' },
          ].map((effect, index) => (
            <div key={index} className="text-center p-4">
              <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center mb-2 mx-auto">
                <span className="text-brand">🎨</span>
              </div>
              <h3 className="font-semibold mb-1">{effect.name}</h3>
              <p className="text-xs text-muted">{effect.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}