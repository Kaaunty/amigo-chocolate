import "./LoadingSpinner.css";

// Quatro quadradinhos de chocolate que acendem em vermelho, um de cada vez
const LoadingSpinner = () => {
  return (
    <div className="loading-spinner-container" role="status">
      <div className="loading-squares" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="loading-text">Carregando...</p>
    </div>
  );
};

export default LoadingSpinner;
