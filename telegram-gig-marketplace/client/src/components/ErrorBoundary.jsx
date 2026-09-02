import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary спіймав помилку:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl mb-4">
            ⚡
          </div>
          <h1 className="text-xl font-bold font-display mb-2">Біржа завдань</h1>
          <p className="text-xs text-slate-400 max-w-xs mb-6">
            Завантаження інтерфейсу... Якщо екран не оновився автоматично, натисніть кнопку нижче.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-full text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            🔄 Оновити сторінку
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}