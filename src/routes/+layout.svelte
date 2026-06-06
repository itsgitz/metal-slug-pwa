<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  const { children }: { children: Snippet } = $props();

  let showUpdate = $state(false);
  let registration: ServiceWorkerRegistration | null = null;

  onMount(async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) showUpdate = true;
    } catch {
      // PWA not available in dev
    }
  });

  function applyUpdate() {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
</script>

{@render children()}

{#if showUpdate}
  <div class="update-banner">
    <span>New version available.</span>
    <button onclick={applyUpdate}>Update</button>
  </div>
{/if}

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(html, body) {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #1a1a2e;
  }

  .update-banner {
    position: fixed;
    bottom: 16px;
    right: 16px;
    background: #1a1a2e;
    color: #f0e040;
    border: 1px solid #f0e040;
    padding: 10px 16px;
    display: flex;
    gap: 12px;
    align-items: center;
    z-index: 9999;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
  }

  .update-banner button {
    background: #f0e040;
    color: #1a1a2e;
    border: none;
    padding: 4px 12px;
    cursor: pointer;
    font-weight: bold;
    font-family: inherit;
  }
</style>
