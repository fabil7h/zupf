import { Example as ExampleComponent } from '../components/Example';
import { examplePages } from '../examples';

export function DrawerExamples() {
  return (
    <>
      <p class="lead">
        Every demo is live: open it, play with it, copy the code. Start with snap points and the scaled background.
      </p>
      {examplePages.map((section) => (
        <section key={section.slug}>
          <h2 id={section.slug}>{section.title}</h2>
          {section.intro && <p class="lead" dangerouslySetInnerHTML={{ __html: section.intro }} />}
          {(section.examples ?? []).map((example) => (
            <ExampleComponent key={example.id} ex={example} />
          ))}
        </section>
      ))}
    </>
  );
}
