"use client";

import Link from "next/link";
import {
  Settings,
  FileText,
  List,
  Wallet,
  Twitter,
  Search,
  BarChart3,
  Bell,
  Palette,
  MessageCircle,
  X,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-panel border-t border-gray-800/50 px-3 sm:px-4 py-2.5 z-40 w-full">
      <div className="w-full flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <button className="px-3 py-1 text-xs bg-panel-elev hover:bg-panel rounded border border-gray-800/50 text-gray-400 hover:text-white transition-colors cursor-pointer font-medium flex items-center gap-1.5">
            <Settings className="w-3 h-3" />
            PRESET 1
          </button>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <FileText className="w-3 h-3" />
              <span>1</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <List className="w-3 h-3" />
              <span>0</span>
            </div>
          </div>
        </div>

        {/* Center Navigation */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs">
          <Link
            href="/portfolio"
            className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 relative"
          >
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"></div>
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
            <span>Wallet</span>
          </Link>
          <a
            href="#"
            className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 relative"
          >
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"></div>
            <Twitter className="w-3.5 h-3.5 text-blue-400" />
            <span>Twitter</span>
          </a>
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 relative"
          >
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"></div>
            <Search className="w-3.5 h-3.5 text-purple-400" />
            <span>Discover</span>
          </Link>
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-yellow-400" />
            <span>PnL</span>
          </Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-300 font-medium">$132.01</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <select className="px-2 py-1 bg-panel-elev border border-gray-800/50 rounded text-xs text-gray-300 focus:outline-none cursor-pointer hover:bg-panel transition-colors">
              <option>GLOBAL</option>
            </select>
          </div>
          <button className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-panel-elev rounded relative">
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500"></div>
            <Bell className="w-3.5 h-3.5" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-panel-elev rounded">
            <Palette className="w-3.5 h-3.5" />
          </button>
          <a
            href="#"
            className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-panel-elev rounded"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>
          <button className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-panel-elev rounded">
            <X className="w-3 h-3" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-panel-elev rounded">
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}

