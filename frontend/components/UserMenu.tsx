"use client";

import Link from "next/link";
import Image from "next/image";
import { useUser, useAuth } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function UserMenu() {
  const { user } = useUser();
  const { signOut } = useAuth();

  const u = user;

  const name = u?.fullName ?? u?.firstName ?? "User";
  const email =
    // Clerk user object shapes can vary depending on plan/config, try a few fallbacks
    u?.primaryEmailAddress?.emailAddress ??
    u?.emailAddresses?.[0]?.emailAddress ??
    "";

  const avatar = u?.imageUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Open account menu"
          className="w-9 h-9 rounded-full overflow-hidden border border-foreground/10 hover:border-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-white dark:bg-neutral-900"
        >
          {avatar ? (
            <Image
              src={avatar}
              alt={name}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <span className="flex w-9 h-9 items-center justify-center bg-gradient-to-tr from-indigo-500 to-purple-400 text-white font-medium">
              {name.charAt(0)}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 rounded-lg overflow-hidden shadow-lg"
      >
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            {avatar ? (
              <Image
                src={avatar}
                alt={name}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 flex items-center justify-center text-white font-medium">
                {name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {email}
              </div>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="p-0">
            <Link href="/account" className="block w-full px-4 py-3 text-sm">
              Manage account
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="p-0">
            <button
              onClick={() => signOut()}
              className="block w-full px-4 py-3 text-sm"
            >
              Sign out
            </button>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
