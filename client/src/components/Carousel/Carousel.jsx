import { useState } from "react";
import "./carousel.styles.scss";

const Carousel = ({ images, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter out low-res thumbnails (28x28) and gift card icons from the repo data
  const slides = images.filter(
    (img) => !img.includes("GIFT_CARD") && !img.includes("w=28")
  );

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  if (!slides.length) return null;

  return (
    <section className="carousel">
      <div className="carousel-viewport">
        <button
          className="nav-btn prev"
          onClick={prevSlide}
          aria-label="Previous image"
        >
          &#10094;
        </button>

        <div className="image-container">
          <img
            src={slides[currentIndex]}
            alt={`${title} - view ${currentIndex + 1}`}
            className="carousel-img"
          />
        </div>

        <button
          className="nav-btn next"
          onClick={nextSlide}
          aria-label="Next image"
        >
          &#10095;
        </button>
      </div>

      <div className="indicator-track">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? "active" : ""}`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Carousel;
