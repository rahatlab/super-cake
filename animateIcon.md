Title: AnimateIcons | 1500+ Free Animated React Icons

URL Source: https://animateicons.in/icons/docs/examples/buttons

Markdown Content:
[Skip to content](https://animateicons.in/icons/docs/examples/buttons#main-content)

[AnimateIcons](https://animateicons.in/)[Icons](https://animateicons.in/icons/lucide)[Docs](https://animateicons.in/icons/docs)

[Sponsor](https://animateicons.in/sponsors)[GitHub 0](https://github.com/Avijit07x/animateicons)

Getting Started

*   [Introduction](https://animateicons.in/icons/docs)

Frameworks

*   [React](https://animateicons.in/icons/docs/react)
*   [Vue](https://animateicons.in/icons/docs/vue)
*   [Angular](https://animateicons.in/icons/docs/angular)
*   [Plain JS](https://animateicons.in/icons/docs/vanilla)

React guides

*   [Hover helper Hook](https://animateicons.in/icons/docs/examples/hover-helper)
*   [Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)
*   [Inputs](https://animateicons.in/icons/docs/examples/inputs)
*   [Cards & feedback](https://animateicons.in/icons/docs/examples/cards)
*   [Menus & navigation](https://animateicons.in/icons/docs/examples/navigation)

Copy the source

*   [shadcn CLI React](https://animateicons.in/icons/docs/shadcn)
*   [animateicons CLI React](https://animateicons.in/icons/docs/cli)

AI agents

*   [MCP Server AI](https://animateicons.in/icons/docs/mcp)

Menu

Getting Started

*   [Introduction](https://animateicons.in/icons/docs)

Frameworks

*   [React](https://animateicons.in/icons/docs/react)
*   [Vue](https://animateicons.in/icons/docs/vue)
*   [Angular](https://animateicons.in/icons/docs/angular)
*   [Plain JS](https://animateicons.in/icons/docs/vanilla)

React guides

*   [Hover helper Hook](https://animateicons.in/icons/docs/examples/hover-helper)
*   [Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)
*   [Inputs](https://animateicons.in/icons/docs/examples/inputs)
*   [Cards & feedback](https://animateicons.in/icons/docs/examples/cards)
*   [Menus & navigation](https://animateicons.in/icons/docs/examples/navigation)

Copy the source

*   [shadcn CLI React](https://animateicons.in/icons/docs/shadcn)
*   [animateicons CLI React](https://animateicons.in/icons/docs/cli)

AI agents

*   [MCP Server AI](https://animateicons.in/icons/docs/mcp)

[Docs](https://animateicons.in/icons/docs)Buttons & tooltips Open in AI

# Buttons & tooltips

Attach a ref to the icon and drive it from the control's hover, so the whole button or tooltip trigger is what plays the animation. This is the same ref API covered in the [React guide](https://animateicons.in/icons/docs/react#playing-it-yourself).

## [#](https://animateicons.in/icons/docs/examples/buttons#button)Button

The button owns the hover, the icon just follows.

Download

Example.tsx

tsx

```
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { DownloadIcon, type DownloadIconHandle } from "@animateicons/react/huge"

export function DownloadButton() {
	const ref = useRef<DownloadIconHandle>(null)

    return (
    	<Button
    		onMouseEnter={() => ref.current?.startAnimation()}
    		onMouseLeave={() => ref.current?.stopAnimation()}
    	>
    		<DownloadIcon ref={ref} size={16} />
    		Download
    	</Button>
    )

}
```

## [#](https://animateicons.in/icons/docs/examples/buttons#tooltip)Tooltip

An icon-only button with a tooltip. Hovering plays the icon and reveals the label at once.

Example.tsx

tsx

```
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { Delete02Icon, type Delete02IconHandle } from "@animateicons/react/huge"

export function DeleteButton() {
	const ref = useRef<Delete02IconHandle>(null)

    return (
    	<Tooltip>
    		<TooltipTrigger asChild>
    			<Button
    				variant="secondary"
    				size="icon"
    				aria-label="Delete"
    				onMouseEnter={() => ref.current?.startAnimation()}
    				onMouseLeave={() => ref.current?.stopAnimation()}
    			>
    				<Delete02Icon ref={ref} size={16} />
    			</Button>
    		</TooltipTrigger>
    		<TooltipContent>Delete</TooltipContent>
    	</Tooltip>
    )

}
```

[Previous Hover helper](https://animateicons.in/icons/docs/examples/hover-helper)[Next Inputs](https://animateicons.in/icons/docs/examples/inputs)

Need a hand?

Open an issue on GitHub or reach out on Twitter, we're happy to help.

[Open an issue](https://github.com/Avijit07x/animateicons/issues/new)[Twitter](https://twitter.com/avijit07x)

Contribute

[Edit this page](https://github.com/Avijit07x/animateicons/edit/main/app/icons/docs/examples/buttons/page.mdx)[Report an issue](https://github.com/Avijit07x/animateicons/issues/new)

Community

[Star on GitHub 1,521](https://github.com/Avijit07x/animateicons)

[](https://twitter.com/avijit07x)[](https://www.linkedin.com/in/Avijit07x)

Title: AnimateIcons | 1500+ Free Animated React Icons

URL Source: https://animateicons.in/icons/docs/examples/hover-helper

Markdown Content:
[Skip to content](https://animateicons.in/icons/docs/examples/hover-helper#main-content)

[AnimateIcons](https://animateicons.in/)[Icons](https://animateicons.in/icons/lucide)[Docs](https://animateicons.in/icons/docs)

[Sponsor](https://animateicons.in/sponsors)[GitHub 0](https://github.com/Avijit07x/animateicons)

Getting Started

*   [Introduction](https://animateicons.in/icons/docs)

Frameworks

*   [React](https://animateicons.in/icons/docs/react)
*   [Vue](https://animateicons.in/icons/docs/vue)
*   [Angular](https://animateicons.in/icons/docs/angular)
*   [Plain JS](https://animateicons.in/icons/docs/vanilla)

React guides

*   [Hover helper Hook](https://animateicons.in/icons/docs/examples/hover-helper)
*   [Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)
*   [Inputs](https://animateicons.in/icons/docs/examples/inputs)
*   [Cards & feedback](https://animateicons.in/icons/docs/examples/cards)
*   [Menus & navigation](https://animateicons.in/icons/docs/examples/navigation)

Copy the source

*   [shadcn CLI React](https://animateicons.in/icons/docs/shadcn)
*   [animateicons CLI React](https://animateicons.in/icons/docs/cli)

AI agents

*   [MCP Server AI](https://animateicons.in/icons/docs/mcp)

Menu

Getting Started

*   [Introduction](https://animateicons.in/icons/docs)

Frameworks

*   [React](https://animateicons.in/icons/docs/react)
*   [Vue](https://animateicons.in/icons/docs/vue)
*   [Angular](https://animateicons.in/icons/docs/angular)
*   [Plain JS](https://animateicons.in/icons/docs/vanilla)

React guides

*   [Hover helper Hook](https://animateicons.in/icons/docs/examples/hover-helper)
*   [Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)
*   [Inputs](https://animateicons.in/icons/docs/examples/inputs)
*   [Cards & feedback](https://animateicons.in/icons/docs/examples/cards)
*   [Menus & navigation](https://animateicons.in/icons/docs/examples/navigation)

Copy the source

*   [shadcn CLI React](https://animateicons.in/icons/docs/shadcn)
*   [animateicons CLI React](https://animateicons.in/icons/docs/cli)

AI agents

*   [MCP Server AI](https://animateicons.in/icons/docs/mcp)

[Docs](https://animateicons.in/icons/docs)Hover helper Open in AI

# Hover helper

Play an icon animation when a user hovers or clicks a button.

## [#](https://animateicons.in/icons/docs/examples/hover-helper#hover)Hover

Notifications Hover the button to play the animation.

Example.tsx

tsx

```
"use client"

import { Button } from "@/components/ui/button"
import { NotificationIcon } from "@animateicons/react/huge"
import { useIconHover } from "@animateicons/react"

export function NotificationBell() {
	const { ref, triggerProps } = useIconHover()

	return (
		<Button variant="secondary" {...triggerProps}>
			<NotificationIcon ref={ref} size={18} />
			Notifications
		</Button>
	)
}
```

## [#](https://animateicons.in/icons/docs/examples/hover-helper#click)Click

Copy Click the button to play the animation.

Example.tsx

tsx

```
"use client"

import { Button } from "@/components/ui/button"
import { CopyIcon } from "@animateicons/react/huge"
import { useIconHover } from "@animateicons/react"

export function CopyButton() {
	const { ref, triggerProps } = useIconHover({ trigger: "click" })

	return (
		<Button variant="secondary" {...triggerProps}>
			<CopyIcon ref={ref} size={18} />
			Copy
		</Button>
	)
}
```

## [#](https://animateicons.in/icons/docs/examples/hover-helper#hover-and-click)Hover and click

Save Hover or click the button to play the animation.

Example.tsx

tsx

```
"use client"

import { Button } from "@/components/ui/button"
import { BookmarkIcon } from "@animateicons/react/huge"
import { useIconHover } from "@animateicons/react"

export function SaveButton() {
	const { ref, triggerProps } = useIconHover({ trigger: "both" })

	return (
		<Button variant="secondary" {...triggerProps}>
			<BookmarkIcon ref={ref} size={18} />
			Save
		</Button>
	)
}
```

## [#](https://animateicons.in/icons/docs/examples/hover-helper#multiple-icons)Multiple icons

Use the `useIconHover` hook to manage the animation of multiple icons. Each button plays only the icons inside it.

Save bookmark: hover

Notify bell: click

Example.tsx

tsx

```
"use client"

import { Button } from "@/components/ui/button"
import { BookmarkIcon, NotificationIcon } from "@animateicons/react/huge"
import { useIconHover } from "@animateicons/react"

const triggerConfig = [
	{ icon: "bell", trigger: "click" },
	{ icon: "bookmark", trigger: "hover" },
] as const

export function Actions() {
	const {
		icon: { bell, bookmark },
		trigger,
	} = useIconHover({ trigger: triggerConfig })

	return (
		<>
			<Button variant="secondary" {...trigger}>
				<BookmarkIcon {...bookmark} size={18} />
				Save
			</Button>

			<Button variant="secondary" {...trigger}>
				<NotificationIcon {...bell} size={18} />
				Notify
			</Button>
		</>
	)
}
```

## [#](https://animateicons.in/icons/docs/examples/hover-helper#wrapper)Wrapper

Hooks cannot be used inside a loop. Put each button in its own small component instead.

Notify hover

Save click

Favorite both

Example.tsx

tsx

```
"use client";
import { useIconHover, type IconHandle, type IconTrigger } from "@animateicons/react";
import { BookmarkIcon, NotificationIcon, StarIcon } from "@animateicons/react/huge";
import type { ComponentType, Ref } from "react";

type IconProps = { size?: number; ref?: Ref<IconHandle> };

function ActionButton({
	icon: Icon,
	label,
	trigger,
}: {
	icon: ComponentType<IconProps>;
	label: string;
	trigger: IconTrigger;
}) {
	const { ref, triggerProps } = useIconHover({ trigger });

	return (
		<button {...triggerProps}>
			<Icon ref={ref} size={18} />
			{label}
		</button>
	);
}

export default function Toolbar() {
	return (
		<div>
			<ActionButton icon={NotificationIcon} label="Notify" trigger="hover" />
			<ActionButton icon={BookmarkIcon} label="Save" trigger="click" />
			<ActionButton icon={StarIcon} label="Favorite" trigger="both" />
		</div>
	);
}
```

## [#](https://animateicons.in/icons/docs/examples/hover-helper#without-the-npm-package)Without the npm package

Not using the npm package? Copy this hook into your project.

hooks/use-icon-hover.ts

tsx

```
import { useId, useMemo, type RefObject, type SyntheticEvent } from "react";
type IconHandle = {
	startAnimation: () => void;
	stopAnimation: () => void;
};

export type IconTrigger = "hover" | "click" | "both";

export type IconConfig = {
	icon: string;
	trigger: IconTrigger;
};

export type IconTriggerProps = {
	onMouseEnter?: (event?: SyntheticEvent<HTMLElement>) => void;
	onMouseLeave?: (event?: SyntheticEvent<HTMLElement>) => void;
	onClick?: (event?: SyntheticEvent<HTMLElement>) => void;
};

type IconRef = RefObject<IconHandle | null>;

export type IconRefProps = {
	ref: IconRef;
	"data-animateicon": string;
};

type SingleOptions = {
	trigger?: IconTrigger;
};

type ConfigOptions<C extends readonly IconConfig[]> = {
	trigger: C;
};

type SingleResult = {
	ref: IconRef;
	triggerProps: IconTriggerProps;
};

type ConfigResult<C extends readonly IconConfig[]> = {
	icon: { [K in C[number]["icon"]]: IconRefProps };
	trigger: IconTriggerProps;
};

const MARKER = "data-animateicon";
const TRIGGERS: readonly string[] = ["hover", "click", "both"];
const OPTION_KEYS: readonly string[] = ["trigger"];
const ENTRY_KEYS: readonly string[] = ["icon", "trigger"];

const isTrigger = (value: unknown): value is IconTrigger =>
	typeof value === "string" && TRIGGERS.includes(value);

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const show = (value: unknown) => {
	if (typeof value === "string") return JSON.stringify(value);
	try {
		return String(value);
	} catch {
		return Object.prototype.toString.call(value);
	}
};

const resolve = (options: unknown) => {
	if (!isObject(options)) {
		throw new TypeError(
			`useIconHover: options must be an object like { trigger: "click" }, received ${show(options)}.`,
		);
	}

	const unknownOption = Object.keys(options).find(
		(key) => !OPTION_KEYS.includes(key),
	);
	if (unknownOption !== undefined) {
		throw new TypeError(
			`useIconHover: unknown option "${unknownOption}". The only option is "trigger".`,
		);
	}

	const { trigger = "hover" } = options;

	if (isTrigger(trigger)) {
		return { list: false, entries: [{ icon: "", trigger }] as IconConfig[] };
	}

	if (!Array.isArray(trigger)) {
		throw new TypeError(
			`useIconHover: "trigger" must be "hover", "click", "both" or a list like [{ icon: "bell", trigger: "click" }], received ${show(trigger)}.`,
		);
	}

	if (trigger.length === 0) {
		throw new RangeError('useIconHover: "trigger" must not be an empty list.');
	}

	const seen = new Set<string>();

	const entries = trigger.map((entry: unknown, index: number): IconConfig => {
		const label = `trigger[${index}]`;

		if (!isObject(entry)) {
			throw new TypeError(
				`useIconHover: ${label} must be an object like { icon: "bell", trigger: "click" }, received ${show(entry)}.`,
			);
		}

		const unknownKey = Object.keys(entry).find(
			(key) => !ENTRY_KEYS.includes(key),
		);
		if (unknownKey !== undefined) {
			throw new TypeError(
				`useIconHover: ${label} has an unknown key "${unknownKey}". Valid keys are "icon" and "trigger".`,
			);
		}

		if (typeof entry.icon !== "string" || entry.icon === "") {
			throw new TypeError(
				`useIconHover: ${label}.icon must be a non-empty string, received ${show(entry.icon)}.`,
			);
		}

		if (!isTrigger(entry.trigger)) {
			throw new TypeError(
				`useIconHover: ${label}.trigger must be "hover", "click" or "both", received ${show(entry.trigger)}.`,
			);
		}

		if (seen.has(entry.icon)) {
			throw new TypeError(
				`useIconHover: the icon ${show(entry.icon)} appears more than once in "trigger". Each icon name must be unique.`,
			);
		}
		seen.add(entry.icon);

		return { icon: entry.icon, trigger: entry.trigger };
	});

	return { list: true, entries };
};

const schedule = (callback: () => void) => {
	if (typeof requestAnimationFrame === "function") {
		requestAnimationFrame(callback);
	} else {
		setTimeout(callback, 0);
	}
};

const scopeOf = (event?: SyntheticEvent<HTMLElement>) => {
	const element = event?.currentTarget;
	return element && typeof element.querySelectorAll === "function"
		? element
		: undefined;
};

const markersIn = (scope: HTMLElement) => {
	const found = new Set<string>();
	const own = scope.getAttribute(MARKER);
	if (own) found.add(own);
	scope.querySelectorAll(`[${MARKER}]`).forEach((element) => {
		const value = element.getAttribute(MARKER);
		if (value) found.add(value);
	});
	return found;
};

const onHover = (mode: IconTrigger) => mode !== "click";
const onClick = (mode: IconTrigger) => mode !== "hover";

export function useIconHover(options?: SingleOptions): SingleResult;
export function useIconHover<const C extends readonly IconConfig[]>(
	options: ConfigOptions<C>,
): ConfigResult<C>;
export function useIconHover(options: unknown = {}): unknown {
	const { list, entries } = resolve(options);
	const id = useId();
	const key = JSON.stringify(entries);

	return useMemo(() => {
		const targets = (JSON.parse(key) as IconConfig[]).map((entry) => ({
			...entry,
			marker: `${id}:${entry.icon}`,
			ref: { current: null } as IconRef,
		}));

		const play = (
			plays: (mode: IconTrigger) => boolean,
			action: (handle: IconHandle) => void,
			scope?: HTMLElement,
		) => {
			const inside = scope ? markersIn(scope) : undefined;
			targets.forEach(({ icon, marker, trigger, ref }) => {
				const handle = ref.current;
				if (!handle || !plays(trigger)) return;
				if (inside && !inside.has(marker)) return;
				if (
					typeof handle.startAnimation !== "function" ||
					typeof handle.stopAnimation !== "function"
				) {
					throw new TypeError(
						`useIconHover: ${list ? `icon.${icon}` : "ref"} is attached to something that is not an AnimateIcons icon. Pass it to an icon component.`,
					);
				}
				action(handle);
			});
		};

		const scoped = (event?: SyntheticEvent<HTMLElement>) =>
			list ? scopeOf(event) : undefined;

		const props: IconTriggerProps = {};

		if (targets.some(({ trigger }) => onHover(trigger))) {
			props.onMouseEnter = (event) =>
				play(onHover, (handle) => handle.startAnimation(), scoped(event));
			props.onMouseLeave = (event) =>
				play(onHover, (handle) => handle.stopAnimation(), scoped(event));
		}

		if (targets.some(({ trigger }) => onClick(trigger))) {
			props.onClick = (event) => {
				const scope = scoped(event);
				schedule(() =>
					play(onClick, (handle) => handle.startAnimation(), scope),
				);
			};
		}

		if (!list) return { ref: targets[0].ref, triggerProps: props };

		return {
			icon: Object.fromEntries(
				targets.map(({ icon, marker, ref }) => [
					icon,
					{ ref, [MARKER]: marker },
				]),
			),
			trigger: props,
		};
	}, [key, list, id]);
}
```

[Previous Plain JS](https://animateicons.in/icons/docs/vanilla)[Next Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)

Need a hand?

Open an issue on GitHub or reach out on Twitter, we're happy to help.

[Open an issue](https://github.com/Avijit07x/animateicons/issues/new)[Twitter](https://twitter.com/avijit07x)

Contribute

[Edit this page](https://github.com/Avijit07x/animateicons/edit/main/app/icons/docs/examples/hover-helper/page.mdx)[Report an issue](https://github.com/Avijit07x/animateicons/issues/new)

Community

[Star on GitHub 1,521](https://github.com/Avijit07x/animateicons)

[](https://twitter.com/avijit07x)[](https://www.linkedin.com/in/Avijit07x)


Title: AnimateIcons | 1500+ Free Animated React Icons

URL Source: http://animateicons.in/icons/docs/examples/inputs

Final URL: https://animateicons.in/icons/docs/examples/inputs

Markdown Content:
[Skip to content](https://animateicons.in/icons/docs/examples/inputs#main-content)

[AnimateIcons](https://animateicons.in/)[Icons](https://animateicons.in/icons/lucide)[Docs](https://animateicons.in/icons/docs)

[Sponsor](https://animateicons.in/sponsors)[GitHub 0](https://github.com/Avijit07x/animateicons)

Getting Started

*   [Introduction](https://animateicons.in/icons/docs)

Frameworks

*   [React](https://animateicons.in/icons/docs/react)
*   [Vue](https://animateicons.in/icons/docs/vue)
*   [Angular](https://animateicons.in/icons/docs/angular)
*   [Plain JS](https://animateicons.in/icons/docs/vanilla)

React guides

*   [Hover helper Hook](https://animateicons.in/icons/docs/examples/hover-helper)
*   [Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)
*   [Inputs](https://animateicons.in/icons/docs/examples/inputs)
*   [Cards & feedback](https://animateicons.in/icons/docs/examples/cards)
*   [Menus & navigation](https://animateicons.in/icons/docs/examples/navigation)

Copy the source

*   [shadcn CLI React](https://animateicons.in/icons/docs/shadcn)
*   [animateicons CLI React](https://animateicons.in/icons/docs/cli)

AI agents

*   [MCP Server AI](https://animateicons.in/icons/docs/mcp)

Menu

Getting Started

*   [Introduction](https://animateicons.in/icons/docs)

Frameworks

*   [React](https://animateicons.in/icons/docs/react)
*   [Vue](https://animateicons.in/icons/docs/vue)
*   [Angular](https://animateicons.in/icons/docs/angular)
*   [Plain JS](https://animateicons.in/icons/docs/vanilla)

React guides

*   [Hover helper Hook](https://animateicons.in/icons/docs/examples/hover-helper)
*   [Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)
*   [Inputs](https://animateicons.in/icons/docs/examples/inputs)
*   [Cards & feedback](https://animateicons.in/icons/docs/examples/cards)
*   [Menus & navigation](https://animateicons.in/icons/docs/examples/navigation)

Copy the source

*   [shadcn CLI React](https://animateicons.in/icons/docs/shadcn)
*   [animateicons CLI React](https://animateicons.in/icons/docs/cli)

AI agents

*   [MCP Server AI](https://animateicons.in/icons/docs/mcp)

[Docs](https://animateicons.in/icons/docs)Inputs Open in AI

# Inputs

Put an icon in the field's addon and play it on focus, so the icon reacts as the user starts typing. Here the trigger is `onFocus` / `onBlur` rather than hover.

## [#](https://animateicons.in/icons/docs/examples/inputs#search-input)Search input

A leading icon in an `InputGroup` that plays when the field gains focus.

Example.tsx

tsx

```
import { useRef } from "react"
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group"
import { SearchIcon, type SearchIconHandle } from "@animateicons/react/huge"

export function SearchField() {
	const ref = useRef<SearchIconHandle>(null)

    return (
    	<InputGroup>
    		<InputGroupAddon>
    			<SearchIcon ref={ref} size={16} />
    		</InputGroupAddon>
    		<InputGroupInput
    			placeholder="Search icons..."
    			onFocus={() => ref.current?.startAnimation()}
    			onBlur={() => ref.current?.stopAnimation()}
    		/>
    	</InputGroup>
    )

}
```

[Previous Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)[Next Cards & feedback](https://animateicons.in/icons/docs/examples/cards)

Need a hand?

Open an issue on GitHub or reach out on Twitter, we're happy to help.

[Open an issue](https://github.com/Avijit07x/animateicons/issues/new)[Twitter](https://twitter.com/avijit07x)

Contribute

[Edit this page](https://github.com/Avijit07x/animateicons/edit/main/app/icons/docs/examples/inputs/page.mdx)[Report an issue](https://github.com/Avijit07x/animateicons/issues/new)

Community

[Star on GitHub 1,521](https://github.com/Avijit07x/animateicons)

[](https://twitter.com/avijit07x)[](https://www.linkedin.com/in/Avijit07x)

Title: AnimateIcons | 1500+ Free Animated React Icons

URL Source: https://animateicons.in/icons/docs/examples/cards

Markdown Content:
[Skip to content](https://animateicons.in/icons/docs/examples/cards#main-content)

[AnimateIcons](https://animateicons.in/)[Icons](https://animateicons.in/icons/lucide)[Docs](https://animateicons.in/icons/docs)

[Sponsor](https://animateicons.in/sponsors)[GitHub 0](https://github.com/Avijit07x/animateicons)

Getting Started

*   [Introduction](https://animateicons.in/icons/docs)

Frameworks

*   [React](https://animateicons.in/icons/docs/react)
*   [Vue](https://animateicons.in/icons/docs/vue)
*   [Angular](https://animateicons.in/icons/docs/angular)
*   [Plain JS](https://animateicons.in/icons/docs/vanilla)

React guides

*   [Hover helper Hook](https://animateicons.in/icons/docs/examples/hover-helper)
*   [Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)
*   [Inputs](https://animateicons.in/icons/docs/examples/inputs)
*   [Cards & feedback](https://animateicons.in/icons/docs/examples/cards)
*   [Menus & navigation](https://animateicons.in/icons/docs/examples/navigation)

Copy the source

*   [shadcn CLI React](https://animateicons.in/icons/docs/shadcn)
*   [animateicons CLI React](https://animateicons.in/icons/docs/cli)

AI agents

*   [MCP Server AI](https://animateicons.in/icons/docs/mcp)

Menu

Getting Started

*   [Introduction](https://animateicons.in/icons/docs)

Frameworks

*   [React](https://animateicons.in/icons/docs/react)
*   [Vue](https://animateicons.in/icons/docs/vue)
*   [Angular](https://animateicons.in/icons/docs/angular)
*   [Plain JS](https://animateicons.in/icons/docs/vanilla)

React guides

*   [Hover helper Hook](https://animateicons.in/icons/docs/examples/hover-helper)
*   [Buttons & tooltips](https://animateicons.in/icons/docs/examples/buttons)
*   [Inputs](https://animateicons.in/icons/docs/examples/inputs)
*   [Cards & feedback](https://animateicons.in/icons/docs/examples/cards)
*   [Menus & navigation](https://animateicons.in/icons/docs/examples/navigation)

Copy the source

*   [shadcn CLI React](https://animateicons.in/icons/docs/shadcn)
*   [animateicons CLI React](https://animateicons.in/icons/docs/cli)

AI agents

*   [MCP Server AI](https://animateicons.in/icons/docs/mcp)

[Docs](https://animateicons.in/icons/docs)Cards & feedback Open in AI

# Cards & feedback

Play the icon on the container's hover so the whole surface is the trigger. Good for feature tiles and status messages where the icon carries the meaning.

## [#](https://animateicons.in/icons/docs/examples/cards#feature-card)Feature card

Put the icon in a rounded tile and play it on card hover to draw attention.

Smart suggestions

Get AI-powered icon recommendations as you type.

Learn more

Example.tsx

tsx

```
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { SparklesIcon, type SparklesIconHandle } from "@animateicons/react/huge"

export function FeatureCard() {
	const ref = useRef<SparklesIconHandle>(null)

    return (
    	<div
    		onMouseEnter={() => ref.current?.startAnimation()}
    		onMouseLeave={() => ref.current?.stopAnimation()}
    		className="rounded-3xl bg-zinc-900 p-5"
    	>
    		<div className="bg-primary/10 text-primary mb-3 flex size-11 items-center justify-center rounded-full">
    			<SparklesIcon ref={ref} size={20} />
    		</div>
    		<p className="font-semibold">Smart suggestions</p>
    		<p className="text-muted-foreground mt-1 text-sm">
    			Get AI-powered icon recommendations as you type.
    		</p>
    		<Button size="sm" variant="secondary" className="mt-4">
    			Learn more
    		</Button>
    	</div>
    )

}
```

## [#](https://animateicons.in/icons/docs/examples/cards#status-banner)Status banner

A success banner whose check plays on hover, reinforcing the confirmation.

Your changes have been saved.

Example.tsx

tsx

```
import { useRef } from "react"
import {
	CheckmarkCircle01Icon,
	type CheckmarkCircle01IconHandle,
} from "@animateicons/react/huge"

export function SavedBanner() {
	const ref = useRef<CheckmarkCircle01IconHandle>(null)

    return (
    	<div
    		onMouseEnter={() => ref.current?.startAnimation()}
    		onMouseLeave={() => ref.current?.stopAnimation()}
    		className="flex items-center gap-3 rounded-3xl bg-emerald-500/10 px-4 py-3"
    	>
    		<CheckmarkCircle01Icon ref={ref} size={18} className="text-emerald-400" />
    		<p className="text-sm">Your changes have been saved.</p>
    	</div>
    )

}
```

[Previous Inputs](https://animateicons.in/icons/docs/examples/inputs)[Next Menus & navigation](https://animateicons.in/icons/docs/examples/navigation)

Need a hand?

Open an issue on GitHub or reach out on Twitter, we're happy to help.

[Open an issue](https://github.com/Avijit07x/animateicons/issues/new)[Twitter](https://twitter.com/avijit07x)

Contribute

[Edit this page](https://github.com/Avijit07x/animateicons/edit/main/app/icons/docs/examples/cards/page.mdx)[Report an issue](https://github.com/Avijit07x/animateicons/issues/new)

Community

[Star on GitHub 1,521](https://github.com/Avijit07x/animateicons)

[](https://twitter.com/avijit07x)[](https://www.linkedin.com/in/Avijit07x)