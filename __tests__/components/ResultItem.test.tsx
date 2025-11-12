import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ResultItem } from "../../app/components/ResultItem";
import { NormalizedSearchResult } from "../../app/types";

const mockResult: NormalizedSearchResult = {
  id: 1,
  type: "movie",
  title: "Test Movie",
  year: 2023,
  posterUrl: "/test-poster.jpg",
  rating: 8.5,
  genres: [28, 12, 16],
  overview: "This is a test movie.",
  popularity: 100,
};

describe("ResultItem", () => {
  it("renders the title, year, and type badge", () => {
    const onSelectResult = jest.fn();
    render(<ResultItem result={mockResult} onSelectResult={onSelectResult} />);

    expect(screen.getByText("Test Movie (2023)")).toBeInTheDocument();
    expect(screen.getByText("Movie")).toBeInTheDocument();
  });

  it("renders the poster image if posterUrl is provided", () => {
    const onSelectResult = jest.fn();
    render(<ResultItem result={mockResult} onSelectResult={onSelectResult} />);

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("src", "https://image.tmdb.org/t/p/w200/test-poster.jpg");
    expect(image).toHaveAttribute("alt", "Test Movie poster");
  });

  it("renders a placeholder when posterUrl is not provided", () => {
    const onSelectResult = jest.fn();
    const resultWithoutPoster = { ...mockResult, posterUrl: undefined };
    render(<ResultItem result={resultWithoutPoster} onSelectResult={onSelectResult} />);

    expect(screen.getByTestId("poster-placeholder")).toBeInTheDocument();
  });

  it("renders the rating if available", () => {
    const onSelectResult = jest.fn();
    render(<ResultItem result={mockResult} onSelectResult={onSelectResult} />);

    expect(screen.getByText("8.5")).toBeInTheDocument();
  });

  it("renders up to 3 genres", () => {
    const onSelectResult = jest.fn();
    render(<ResultItem result={mockResult} onSelectResult={onSelectResult} />);

    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it('calls onSelectResult with the correct result when the "Details" button is clicked', () => {
    const onSelectResult = jest.fn();
    render(<ResultItem result={mockResult} onSelectResult={onSelectResult} />);

    fireEvent.click(screen.getByText("Details"));
    expect(onSelectResult).toHaveBeenCalledWith(mockResult);
  });
});
