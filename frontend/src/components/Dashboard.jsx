import UploadCard from './UploadCard';
import AnalysisResults from './AnalysisResults';

export default function Dashboard({
  onAnalyze,
  isLoading,
  error,
  result,
  onToggleSave,
  isSaved,
  user,
  onRequireAuth,
}) {
  return (
    <section className="dashboard-grid">
      <UploadCard onAnalyze={onAnalyze} isLoading={isLoading} error={error} />

      {result ? (
        <AnalysisResults
          data={result}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
          user={user}
          onRequireAuth={onRequireAuth}
        />
      ) : (
        <article className="panel feature-panel">
          <h2>Ready for Analysis</h2>
          <p>
            Upload a food photo to generate personalized recipes, macronutrient estimates,
            and ranked health scores.
          </p>
          <ul>
            <li>Personalized output from your profile and preference data</li>
            <li>One-click save to your account</li>
            <li>Automatic history tracking for each analysis</li>
          </ul>
        </article>
      )}
    </section>
  );
}
