import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TitleView from '@/app/views/TitleView';
import { clearApiResourceCache } from '@/app/hooks/useApiResource';
import { mockMovie, mockTv } from '../../test/mocks';

jest.mock('next/navigation', () => ({
  useSearchParams: () => null,
}));

const mockFetch = (reply: { ok: boolean; status?: number; body?: unknown }) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: reply.ok,
    status: reply.status ?? 200,
    json: async () => reply.body,
  }) as unknown as typeof fetch;
};

describe('TitleView', () => {
  beforeEach(() => {
    clearApiResourceCache();
    localStorage.clear();
    localStorage.setItem('wts.country', '"US"');
  });

  it('shows a loading skeleton before the title loads', () => {
    mockFetch({ ok: true, body: mockMovie });
    render(<TitleView type="movie" id={550} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading title');
  });

  it('renders title metadata once loaded', async () => {
    mockFetch({ ok: true, body: mockMovie });
    render(<TitleView type="movie" id={550} />);

    expect(await screen.findByRole('heading', { name: 'Fight Club' })).toBeInTheDocument();
    expect(screen.getByText('Mischief. Mayhem. Soap.')).toBeInTheDocument();
    expect(screen.getByText('Film')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Watch trailer/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=abc'
    );
  });

  it('renders TV-specific metadata like season count', async () => {
    mockFetch({ ok: true, body: mockTv });
    render(<TitleView type="tv" id={1399} />);

    expect(await screen.findByRole('heading', { name: 'Game of Thrones' })).toBeInTheDocument();
    expect(screen.getByText('Series')).toBeInTheDocument();
    expect(screen.getByText('8 seasons · 73 episodes')).toBeInTheDocument();
  });

  it('saves and unsaves the title', async () => {
    mockFetch({ ok: true, body: mockMovie });
    render(<TitleView type="movie" id={550} />);

    const saveButton = await screen.findByRole('button', { name: 'Save title' });
    await userEvent.click(saveButton);

    expect(await screen.findByRole('button', { name: 'Saved' })).toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('wts.saved') ?? '[]');
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ id: 550, type: 'movie', title: 'Fight Club' });
    });

    await userEvent.click(screen.getByRole('button', { name: 'Saved' }));
    expect(await screen.findByRole('button', { name: 'Save title' })).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the fetch fails', async () => {
    mockFetch({ ok: false, status: 500 });
    render(<TitleView type="movie" id={550} />);

    expect(
      await screen.findByRole('heading', { name: "We couldn't load this title" })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
