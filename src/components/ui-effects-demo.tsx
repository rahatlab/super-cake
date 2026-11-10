"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import Image from "next/image";

export function UIEffectsDemo() {
  const [activeTab, setActiveTab] = useState("tilt");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">Enhanced UI Effects Demo</h1>

      {/* Tab Navigation */}
      <div className="flex justify-center gap-4 mb-8">
        {[
          { id: "tilt", label: "3D Tilt Effect" },
          { id: "shadows", label: "Shadow & Glow Effects" },
          { id: "skeletons", label: "Skeleton Loading" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${activeTab === tab.id
              ? 'bg-brand text-brand-fg shadow-lift'
              : 'bg-surface text-muted hover:bg-brand/10'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "tilt" && (
          <motion.div
            key="tilt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold">Interactive 3D Tilt Effects</h2>
            <p className="text-muted">Move your mouse over the cards to see the tilt effect in action!</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Demo Card 1 */}
              <motion.div
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.95 }}
                className="card p-6 cursor-pointer group"
              >
                <div className="aspect-video bg-gradient-to-br from-brand/20 to-brand/5 rounded-lg mb-4 overflow-hidden">
                  <Image
                    src="/cakes/demo-cake-1.jpg"
                    alt="Demo Cake 1"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <h3 className="font-semibold mb-2">Premium Cake</h3>
                <p className="text-sm text-muted">Luxurious chocolate cake with artisanal ingredients.</p>
              </motion.div>

              {/* Demo Card 2 */}
              <motion.div
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.95 }}
                className="card p-6 cursor-pointer group"
              >
                <div className="aspect-video bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg mb-4 overflow-hidden">
                  <Image
                    src="/cakes/demo-cake-2.jpg"
                    alt="Demo Cake 2"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <h3 className="font-semibold mb-2">Birthday Special</h3>
                <p className="text-sm text-muted">Perfect for celebrating special moments and milestones.</p>
              </motion.div>

              {/* Demo Card 3 */}
              <motion.div
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.95 }}
                className="card p-6 cursor-pointer group"
              >
                <div className="aspect-video bg-gradient-to-br from-success/20 to-success/5 rounded-lg mb-4 overflow-hidden">
                  <Image
                    src="/cakes/demo-cake-3.jpg"
                    alt="Demo Cake 3"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <h3 className="font-semibold mb-2">Wedding Cake</h3>
                <p className="text-sm text-muted">Elegant multi-tier cake for your special day.</p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeTab === "shadows" && (
          <motion.div
            key="shadows"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold">Shadow & Glow Effects</h2>
            <p className="text-muted">Beautiful soft shadows and ambient glow effects for enhanced visual appeal.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Soft Drop Shadow</h3>
                <div className="card p-6 hover:shadow-lift transition-all duration-300">
                  <div className="aspect-square bg-surface rounded-lg flex items-center justify-center">
                    <span className="text-muted">Soft Drop Shadow Card</span>
                  </div>
                </div>

                <h3 className="text-lg font-medium">Ambient Glow</h3>
                <div className="card p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent rounded-lg" />
                  <div className="relative aspect-square bg-gradient-to-br from-brand/5 to-surface rounded-lg flex items-center justify-center">
                    <span className="text-brand">Ambient Glow Effect</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">\n                <h3 className="text-lg font-medium">Interactive Hover</h3>
                <motion.div
                  whileHover={{ 
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                    scale: 1.02
                  }}
                  className="card p-6 cursor-pointer transition-all duration-300"
                >
                  <div className="aspect-square bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-muted">Hover for Enhanced Shadow</span>
                  </div>
                </motion.div>

                <h3 className="text-lg font-medium">Elevated Effect</h3>
                <div className="card p-6 shadow-lift relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-brand/20 to-accent/20 rounded-lg blur opacity-30" />
                  <div className="relative aspect-square bg-surface rounded-lg flex items-center justify-center">
                    <span className="text-brand-strong">Elevated with Shadow Lift</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "skeletons" && (
          <motion.div
            key="skeletons"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold">Smooth Skeleton Loading</h2>
            <p className="text-muted">Beautiful skeleton loaders with shimmer effect for smooth loading experience.</p>

            <div className="space-y-4">
              <button
                onClick={() => setShowSkeletons(!showSkeletons)}
                className="btn btn-primary"
              >
                {showSkeletons ? 'Hide Skeletons' : 'Show Skeletons'}
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {showSkeletons ? (
                  // Skeleton versions
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
                  // Actual content versions
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}