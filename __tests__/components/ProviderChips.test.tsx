import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProviderChips from '@/app/components/ProviderChips';

// Mock buildTmdbImageUrl
jest.mock('@/app/utils/tmdb', () => ({
  buildTmdbImageUrl: (path: string) => (path ? `https://image.tmdb.org/t/p/w92${path}` : undefined),
}));

const popularProvider = {
  provider_id: 8,
  provider_name: 'Netflix',
  logo_path: '/netflix.png',
  display_priority: 0,
};
const otherProvider = {
  provider_id: 999,
  provider_name: 'TestProvider',
  logo_path: '/test.png',
  display_priority: 99,
};
const noLogoProvider = {
  provider_id: 1000,
  provider_name: 'NoLogo',
  logo_path: '',
  display_priority: 100,
};

describe('ProviderChips', () => {
  it('renders chips for all providers', () => {
    render(
      <ProviderChips
        providers={[popularProvider, otherProvider]}
        selectedProviders={[]}
        onChange={() => {}}
      />
    );
    expect(screen.getByTitle('Netflix')).toBeInTheDocument();
    expect(screen.getByTitle('TestProvider')).toBeInTheDocument();
  });

  it('shows Popular section label for popular providers', () => {
    render(
      <ProviderChips providers={[popularProvider]} selectedProviders={[]} onChange={() => {}} />
    );
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('shows All providers section label when both sections have providers', () => {
    render(
      <ProviderChips
        providers={[popularProvider, otherProvider]}
        selectedProviders={[]}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('All providers')).toBeInTheDocument();
  });

  it('filters chips when typing in search box', async () => {
    render(
      <ProviderChips
        providers={[popularProvider, otherProvider]}
        selectedProviders={[]}
        onChange={() => {}}
      />
    );
    const searchInput = screen.getByRole('textbox', { name: /search streaming providers/i });
    await userEvent.type(searchInput, 'Netflix');
    expect(screen.getByTitle('Netflix')).toBeInTheDocument();
    expect(screen.queryByTitle('TestProvider')).not.toBeInTheDocument();
  });

  it('shows no-match message when search has no results', async () => {
    render(
      <ProviderChips providers={[popularProvider]} selectedProviders={[]} onChange={() => {}} />
    );
    const searchInput = screen.getByRole('textbox', { name: /search streaming providers/i });
    await userEvent.type(searchInput, 'zzznomatch');
    expect(screen.getByText(/no providers match/i)).toBeInTheDocument();
  });

  it('calls onChange with id added when clicking unselected chip', async () => {
    const onChange = jest.fn();
    render(
      <ProviderChips providers={[popularProvider]} selectedProviders={[]} onChange={onChange} />
    );
    await userEvent.click(screen.getByTitle('Netflix'));
    expect(onChange).toHaveBeenCalledWith([8]);
  });

  it('calls onChange with id removed when clicking selected chip', async () => {
    const onChange = jest.fn();
    render(
      <ProviderChips providers={[popularProvider]} selectedProviders={[8]} onChange={onChange} />
    );
    await userEvent.click(screen.getByTitle('Netflix'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows fallback placeholder when logo_path is empty', () => {
    render(
      <ProviderChips providers={[noLogoProvider]} selectedProviders={[]} onChange={() => {}} />
    );
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('sets aria-pressed=true for selected provider', () => {
    render(
      <ProviderChips providers={[popularProvider]} selectedProviders={[8]} onChange={() => {}} />
    );
    expect(screen.getByTitle('Netflix')).toHaveAttribute('aria-pressed', 'true');
  });

  it('sets aria-pressed=false for unselected provider', () => {
    render(
      <ProviderChips providers={[popularProvider]} selectedProviders={[]} onChange={() => {}} />
    );
    expect(screen.getByTitle('Netflix')).toHaveAttribute('aria-pressed', 'false');
  });
});
